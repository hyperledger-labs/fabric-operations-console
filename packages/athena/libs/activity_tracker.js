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
// activity_tracker_lib.js - Library functions for logging events
// 11/10/2021 - repurposing this file to make an "audit log", it will no longer conform to the horrible "Activity Tracker" format
// 02/23/2023 - disabled this feature
// 03/29/2023 - enabled this feature
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const exports = {};
	const routes_2_ignore = prepare_routes_2_ignore();									// array of regular expressions of paths to ignore

	let filename = ev.ACTIVITY_TRACKER_FILENAME ? t.path.basename(ev.ACTIVITY_TRACKER_FILENAME) : null;
	const AT_FILENAME = (filename && filename.indexOf('.')) ? filename : 'audit.log';
	const path2file = ev.ACTIVITY_TRACKER_FILENAME ? t.path.join(__dirname, '../logs', AT_FILENAME) : '';
	let atLogger = null;
	const DATE_FMT = '%Y/%M/%d-%H:%m:%s.%rZ';

	// init the log file
	if (ev.ACTIVITY_TRACKER_FILENAME && path2file) {
		t.misc.check_dir_sync({ file_path: path2file, create: true });					// check if the path exists, create it if not
		if (t.fs.existsSync(path2file)) {
			logger.silly('[activity] activity tracker logs is enabled, using location:', path2file);
		} else {
			try {
				t.fs.writeFileSync(path2file, '');											// init file
				logger.debug('[activity] init log file:', path2file);
			} catch (e) {
				logger.error('[activity] unable to write log file:', path2file);
				logger.error(e);
			}
		}

		// build symbolic links if activity tracker log files are outside the athena log folder
		//build_sym_links();

		// make a winston logger for the activity tracker logs
		atLogger = new (t.winston.Logger)({
			level: 'debug',
			transports: [
				new t.winston.transports.File({
					filename: path2file,
					maxsize: 1024 * 1024 * 2,		// unsure of size
					maxFiles: 5,
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

		atLogger.info({
			eventTime: t.misc.formatDate(Date.now(), DATE_FMT),
			type: 'system',
			message: 'console has started - process id: ' + process.env.ATHENA_ID
		});
	}

	//-------------------------------------------------------------
	// build & track the event for activity tracker - (events are http requests but its not all requests, just the ones we want)
	//-------------------------------------------------------------
	exports.track_api = (req, res, json_resp) => {
		if (ev.ACTIVITY_TRACKER_FILENAME && path2file) {
			const at_event = build_event(req, res, json_resp);	// create event, strict format!
			logger.silly('[activity] generated event for req:', t.ot_misc.buildTxId(req), path2file);
			atLogger.debug(at_event);							// track the event by logging it to this file
			return at_event;									// return it for tests
		}
		return null;
	};

	// ------------------------------------------
	// build a activity tracker event JSON that their validator can stomach w/o shitting the bed
	// ------------------------------------------
	const build_event = function (req, res, json_resp) {
		const authTypeMap = {							// map athena auth types to available activity tracker credential.type strings
			bearer: 'token',
			apikey: 'apikey',
			basic: 'basic',
			signature: 'certificate',
			session: 'user'
		};

		let ip = t.misc.format_ip(req.ip, false);		// must be an ip,
		const httpCode = get_code(req, res);			// get code from either athena's http response, or if its a client event, from the body

		// this object structure is a mess - the format is super strict, wordy, and dumb
		const ret = {
			// UTC time of the event - YYYY/MM/DD-HH:mm:ss.SSZ
			eventTime: t.misc.formatDate(Date.now(), DATE_FMT),

			// type of log
			type: 'http',

			// <service name>.<object descriptor>.<action verb>
			action: formatAction(req),

			// this field is undocumented... i think it can be anything
			id: t.ot_misc.buildTxId(req),

			// stuff about the user
			creds: {

				// id of user that logged into ibm cloud
				// (will require a login session)
				uuid: t.middleware.getUuid(req) || '-',

				// username of user that logged into ibm cloud
				// (will require a login session)
				name: t.middleware.getName(req) || '-',

				// the type of credentials that were provided - options: "token", "user", "apikey", "certificate", "public-access"
				type: authTypeMap[t.middleware.getAuthType(req)] || 'public-access',
			},

			// the ip of the initiator of this request (aka user)
			address: ip,

			req: {

				// http method
				method: req.method,

				// url path
				path: req.path,
			},

			// custom data defined by service. adds data to clarify this event.
			res: {
				clientDetails: (req._client_event && req.body && req.body.client_details) ? req.body.client_details : undefined,

				// http status code of response
				statusCode: httpCode,

				// error message
				//errorMsg: t.ot_misc.is_error_code(httpCode) ? json_resp : undefined,		// include error response
			},

			outcome: t.ot_misc.is_error_code(httpCode) ? 'failure' : 'success',

			// our string
			//notificationTxt: req._notifications
		};

		return ret;
	};

	// get the status code from the http request if its a normal event (normal athena api)
	// else get it from the body if its a client event (apollo generated event)
	function get_code(req, res) {
		if (req._client_event === true && req.body) {
			return !isNaN(req.body.http_code) ? Number(req.body.http_code) : 500;
		} else {
			return t.ot_misc.get_code(res);								// normal requests end up here
		}
	}


	// get the last word in the URL  (so "/api/v[123]/logs" -> "logs")
	function get_last_word_in_path(req) {
		const parts = req.path ? req.path.split('/') : [];					// grab the last word in the request's path
		return parts[parts.length - 1] || '-';								// return '-' when we can't find it
	}

	// sanitize the string so activity tracker can handle it
	function simpleStr(str) {
		return (typeof str === 'string') ? str.replace(/[^\w-]/g, '') : '-';
	}

	// get the first iam action on the request
	function getFirstAction(req) {
		return Array.isArray(req.actions) ? req.actions[0] : null;		// pull the first iam action on the request. its always an array of 1.
	}

	// create a action string
	// format: "console.<noun>.<verb>"
	function formatAction(req) {
		try {
			const iam_action = getFirstAction(req);							// get the iam action on the request

			if (req._client_event === true) {
				const resource = (req.params && req.params.resource) ? simpleStr(req.params.resource) : '-';
				const verb = (req.body && req.body.action_verb) ? req.body.action_verb : pickVerb(req);
				const str = ev.STR.ALT_PRODUCT_NAME + '.' + resource + '.' + verb;
				return str.toLowerCase();
			} else {
				let str = '';												// populated below
				if (!iam_action) {											// no action b/c its public
					if (req && req.path.includes('/login')) {
						str = 'users.login';
					} else if (req && req.path.includes('/logout')) {
						str = 'users.logout';
					} else {
						str = get_last_word_in_path(req) + '.' + pickVerb(req);
					}
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
						str = 'server.start';
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
						str = 'general.read';
					}
				} else if (iam_action === ev.STR.SETTINGS_ACTION) {
					str = 'settings.' + pickVerb(req);
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
					logger.warn('[activity] unknown iam action, please add it to activity_tracker_lib:', iam_action, req.actions);
					str = 'unknown.' + pickVerb(req);
				}

				// end format is <service name>.<object descriptor>.<action verb>
				return (ev.STR.ALT_PRODUCT_NAME + '.' + str).toLowerCase();			// pre-append the service name and we are done
			}
		} catch (e) {
			logger.warn('[activity] error building activity log action', e);
			let str = 'unknown.' + pickVerb(req);
			return (ev.STR.ALT_PRODUCT_NAME + '.' + str).toLowerCase();			// pre-append the service name and we are done
		}

		// pick a action verb from the request method for this crud call
		function pickVerb(req) {
			const methodMap = {
				GET: 'read',
				DELETE: 'delete',
				POST: 'create',
				PUT: 'update',
				PATCH: 'configure',
				HEAD: 'peak',
				OPTIONS: 'examine',
				VIEW: 'view',
			};

			if (req.method && methodMap[req.method]) {
				return methodMap[req.method];
			} else {
				return 'monitor';
			}
		}
	}

	//-------------------------------------------------------------
	// do not track some requests
	//-------------------------------------------------------------
	exports.ignore_req = (req, res) => {
		if (req && req.path) {									// use req.path instead of req.url, path omits query params
			const req_path = strip_route(req.path);

			// ignore UI GET methods - sometimes
			if (req.method === 'GET' && (req_path.indexOf('/api/') === 0 || req_path.indexOf('/deployer/') === 0)) {
				if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 400) {		// always log on some errors
					return false;
				}
				if (!is_exception(req_path)) {
					return true;								// ignore GET requests from the UI - too noisy
				}
			}

			// ignore redirects - sometimes
			if (res.statusCode === 302) {
				if (!is_exception(req_path)) {					// don't ignore login/logout redirects
					return true;
				}
			}

			// ignore noisy routes
			for (let i in routes_2_ignore) {
				if (RegExp(routes_2_ignore[i]).test(req_path)) {
					return true;
				}
			}
		}
		return false;

		// some reqs are an exception to the broader ignore list
		function is_exception(path) {
			const get_exceptions = [							// we want to track login and logout requests
				'^' + ev.LOGIN_URI,
				'^' + ev.LOGOUT_URI,
				'^/api/v[123]/logs/*',							// do log these GET reqs
			];

			let is_exception = false;
			for (let i in get_exceptions) {
				if (RegExp(get_exceptions[i]).test(path)) {
					is_exception = true;
				}
			}
			return is_exception;
		}
	};

	// remove trailing slash if applicable (makes regex work right)
	function strip_route(str) {
		if (str[str.length - 1] === '/') {
			return str.substring(0, str.length - 1);
		} else {
			return str;
		}
	}

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
	/* no longer needed
	function build_sym_links() {
		const log_folder = t.log_lib.get_log_path();
		if (!path2file.includes(log_folder)) {										// test if this file is outside the log folder
			build_link(t.path.join(ev.ACTIVITY_TRACKER_FILENAME, AT_FILENAME));
		}

		function build_link(pathToFile) {
			if (t.fs.existsSync(pathToFile)) {										// build the link if the file exists
				const file_name = t.path.basename(pathToFile);						// get the filename from the path
				try {
					const path2link = t.path.join(log_folder, file_name);
					t.fs.symlink(pathToFile, path2link, 'file', err => {
						logger.debug('[activity] symbolic link created', path2link);
					});
				} catch (e) {
					logger.error('[activity] unable to create symbolic link:', pathToFile);
					logger.error(e);
				}
			}
		}
	}*/

	return exports;
};
