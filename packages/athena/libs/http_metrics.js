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
//-------------------------------------------------------------
// http_metrics.js - log all http response, builds http access data, and build http metrics data
//-------------------------------------------------------------
/*
Usage (follow steps 1-3, steps 4 & 5 are shady and should not be trusted, jk, but they are optional):

	// -----------------
	// 1. load http_metrics.start() at the start of your app (before all routes).
	// this will log response to all http requests.
	// -----------------
	const opts = {
		ignore_routes: ['/api/v1/http_metrics']		// array of routes that will not get metrics (regex not supported)
		healthcheck_route: '',
		max_access_logs: 10000						// max number of http access logs to keep, rolling window once exceeded
	};
	const http_metrics = require('./libs/http_metrics.js')(logger, tools, opts);
	app.use(http_metrics.start);

	// -----------------
	// 2. add your routes or route files.
	// -----------------
	app.use('/', require('*')(logger, ev, tools, passport));	// example route file, do your own thing
	...

	// -----------------
	// 3. (optional - but highly advised) tell http_metrics about the wildcard routes.
	// use the wild card routes to build metrics on the registered route w/express instead of the exact request...
	// meaning instead of a metric on "GET /api/v1/components/davids-ca", you will get a metric for "GET /api/v1/components/:component_id".
	// -----------------
	const dyn_routes = http_metrics.get_dynamic_routes(app);	// if you want, modify the array of strings
	http_metrics.set_wildcard_routes(dyn_routes);				// send array of strings, the strings should be the same as the registered routes in express

	// -----------------
	// 4. (optional) turn on/off metric gathering. defaults on
	// does not influence response logging.
	// -----------------
	http_metrics.enable_http_metrics(false);

	// -----------------
	// 5. (optional) get the metrics data, do with it as you please.
	// example: build a route to expose the metrics data.
	// -----------------
	app.get('/api/v1/http_metrics/:days?', middleware.something, (req, res, next) => {
		res.status(200).json(http_metrics.get_metrics(req.params.days));
	});
*/
module.exports = function (logger, t, opts) {
	const exports = {};
	if (!opts) { opts = {}; }
	let access_logs = {
		http_access_max_logs: opts.max_access_logs || 10000,		// btw every 1,000 lines is roughly 100KB of data
		http_access_format: '<response_date> <process_id> <username> <method> <route> HTTP/<http_version> <status_code> <user_agent_hash> <response_ms>' +
			' <ip_hash>',
		http_access: [],
		seen_user_agents: {},
	};
	let wildcard_routes = {};
	let COLLECT_HTTP_ACCESS = true;
	let aggregated_athena_metrics = [];
	let aggregate_tx_id = null;

	// build list of routes to NOT track (atm this is used for the metrics API route itself)
	const routes_2_ignore = {};
	for (let ign_method in opts.ignore_routes) {									// if path ends with an optional param, make two paths, 1 without and 1 with
		for (let i in opts.ignore_routes[ign_method]) {								// if path ends with an optional param, make two paths, 1 without and 1 with
			const route = opts.ignore_routes[ign_method][i];

			if (!routes_2_ignore[ign_method]) {										// new method, init
				routes_2_ignore[ign_method] = [];
			}

			routes_2_ignore[ign_method].push(route.replace(/:[^/]+/g, '.+') + '$');	// build a wildcard expression - [1]
			if (route[route.length - 1] === '?') {									// if optional param at end of the route, build exact match expression - [2]
				routes_2_ignore[ign_method].push(route.replace(/\/:[^/]+\?/g, ''));
			}
		}
	}

	// --------------------------------------------------
	// enable or disable metrics gathering
	// --------------------------------------------------
	exports.enable_http_metrics = (enable) => {
		COLLECT_HTTP_ACCESS = (enable === true);
	};

	// --------------------------------------------------
	// returns http metrics data as json, includes summary
	// --------------------------------------------------
	exports.get_metrics = (days_summary) => {
		return build_metrics(access_logs, days_summary);
	};

	// --------------------------------------------------
	// returns http metrics data as json, no summary
	// --------------------------------------------------
	exports.get_raw_metrics = () => {
		return access_logs;
	};

	// --------------------------------------------------
	// empties local metrics data
	// --------------------------------------------------
	exports.clear_metrics = () => {
		access_logs.http_access = [];
		access_logs.seen_user_agents = {};
		return null;
	};

	// --------------------------------------------------
	// load an object of methods each with an array of routes that should be edited to remove user input - see usage above for example
	// --------------------------------------------------
	exports.set_wildcard_routes = (obj) => {
		wildcard_routes = obj ? obj : {};
	};

	// --------------------------------------------------
	// add the athena data with the other athena data - messages from other athenas will be received via pillow talk, and we store them with this
	// --------------------------------------------------
	exports.append_aggregated_metrics = (data) => {
		if (data.tx_id > aggregate_tx_id) {			// if this tx id is higher, it is older, clear the old and continue aggregating
			exports.clear_aggregated_metrics();		// a double hit may send duplicate requests, only keep 1 set by deleting the previous
			aggregate_tx_id = data.tx_id;			// remember the tx we are working on
		}
		aggregated_athena_metrics.push(data);
	};

	// --------------------------------------------------
	// reset/clear the metrics we have gathered from multiple athenas
	// --------------------------------------------------
	exports.clear_aggregated_metrics = () => {
		aggregated_athena_metrics = [];
	};

	// --------------------------------------------------
	// return http metrics data as json across all athena processes, includes summary - the metrics api hits this
	// --------------------------------------------------
	exports.get_aggregated_metrics = (days_summary) => {
		let ha_metrics = {
			http_access_max_logs: 0,
			http_access_format: access_logs.http_access_format,
			http_access: [],
			process_ids: [],
			seen_user_agents: {},
		};
		const seen_ids = {};

		for (let i in aggregated_athena_metrics) {
			ha_metrics.http_access_max_logs += aggregated_athena_metrics[i].http_access_max_logs;
			ha_metrics.http_access = ha_metrics.http_access.concat(aggregated_athena_metrics[i].http_access);
			const id = aggregated_athena_metrics[i].process_id;
			if (id) {
				seen_ids[id] = true;
			}

			// merge the "seen_user_agents" hashes from different athena's
			for (let hash in aggregated_athena_metrics[i].seen_user_agents) {
				if (!ha_metrics.seen_user_agents[hash]) {
					ha_metrics.seen_user_agents[hash] = aggregated_athena_metrics[i].seen_user_agents[hash];
				} else {

					// the other process used the same hash for a different user-agent string, nuts
					if (ha_metrics.seen_user_agents[hash].str !== aggregated_athena_metrics[i].seen_user_agents[hash].str) {
						if (!ha_metrics.seen_user_agents[hash].collisions) {
							ha_metrics.seen_user_agents[hash].collisions = [];
						}
						ha_metrics.seen_user_agents[hash].collisions.push(aggregated_athena_metrics[i].seen_user_agents[hash].str);	// note it and move on
					}
				}
			}

		}
		ha_metrics.process_ids = Object.keys(seen_ids);									// gather the athena process ids, for debug
		ha_metrics.http_access.sort();													// re sort the http access logs

		return build_metrics(ha_metrics, days_summary);
	};

	// --------------------------------------------------
	// log each http request and if enabled record metrics
	// --------------------------------------------------
	exports.start = (req, res, next) => {
		return log_req(null, req, res, next);
	};

	exports.start_err = (err, req, res, next) => {
		return log_req(err, req, res, next);
	};

	function log_req(err, req, res, next) {
		req._start_time = Date.now();
		req._orig_path = req.path;
		req._orig_url = req.url;
		const end = res.end;															// store the real end(), going to put it back later
		const lim_len = access_logs.http_access_max_logs;

		res.end = (chunk, encoding) => {
			res.end = end;																// put her back
			res.end(chunk, encoding);													// let the real one go
			const elapsed = Date.now() - req._start_time;

			// format the route to its registered express wildcard str
			let lc_method = req.method.toLowerCase();
			let path = find_wild_card_path(wildcard_routes[lc_method]) || find_wild_card_path(wildcard_routes._all) || req._orig_path;
			if (path && path.length > 128) {											// lim length in case of attack
				path = path.substring(0, 124) + '...';
			}
			const agent_hash = exports.record_user_agent(req);							// grab the user-agent hash so we can log it
			const ip_hash = t.misc.format_ip(req.ip, true);

			// log req
			if (!req.path.includes(opts.healthcheck_route)) {							// avoid spamming logs with the healtcheck api
				logger.info('[' + t.ot_misc.buildTxId(req) + '] ended HTTP/' + req.httpVersion + ' ' + req.method + ' ' +
					path + ' ' + res.statusCode + ' ' + agent_hash + ' ' + elapsed + ' ms', ip_hash);
			}

			// record req
			if (COLLECT_HTTP_ACCESS !== true) {
				exports.clear_metrics();
			} else {
				if (!ignore_this_route(path, lc_method)) {
					let client = t.misc.censorEmail(t.middleware.getEmail(req));
					if (client === 'unknown_email') {
						client = '-';
					}

					access_logs.http_access.push(t.misc.formatDate(req._start_time, '%Y/%M/%d-%H:%m:%s.%rZ') + ' ' + process.env.ATHENA_ID + ' ' + client +
						' ' + req.method + ' ' + path + ' HTTP/' + req.httpVersion + ' ' + res.statusCode + ' ' + agent_hash + ' ' + elapsed + ' ' + ip_hash);

					if (access_logs.http_access.length > lim_len) {
						const lim = access_logs.http_access.length - lim_len;
						access_logs.http_access = access_logs.http_access.slice(lim < 0 ? 0 : lim, lim_len + 1);	// limit size of metrics in memory
					}
				}
			}
		};
		if (err) {
			return next(err, req, res);		// pass the error on
		} else {
			return next();
		}

		// check path in request against wildcard paths - return wildcard if found
		function find_wild_card_path(wildcard_paths) {
			let path2use = null;
			for (let i in wildcard_paths) {
				try {
					const regex = wildcard_paths[i].replace(/:[^/]+/g, '.+') + '$';		// build a real regex str out of the express route
					if (RegExp('^' + regex).test(req._orig_path)) {						// use req.path instead of req.url, path omits query params
						path2use = wildcard_paths[i];									// replace the route we record w/one w/o user input data
						break;
					}
				} catch (e) {
					logger.warn(e);
				}
			}

			if (path2use) {
				path2use = copy_api_version(path2use);
				req._wildcard_path = path2use;											// store here for segment
			}
			return path2use;
		}

		// undo the wildcard syntax on the path with the version in the request. "/v[123]/" -> "/v2/"
		function copy_api_version(express_path) {
			if (express_path) {			// this should do something like replace express string "/api/v[123]/components" with "/api/v3/components"
				const version = t.ot_misc.get_api_version(req);
				express_path = express_path.replace(/\/v\[\d+\]\//, ('/' + version + '/'));	// replace express's regex api ver w/the real ver from the req
			}
			return express_path;
		}
	}

	// --------------------------------------------------
	// parse app and get all express routes/methods that have a wildcard in it - preserves route order
	// --------------------------------------------------
	exports.get_dynamic_routes = (app, append_routes) => {
		const stack = app.stack || (app._router && app._router.stack);
		let routes = {};														// object is of methods, like {"get": [], "post": []}

		for (let i in stack) {
			const obj = stack[i];

			if (obj.route) {
				const methods = Object.keys(obj.route.methods);					// make array of method names, always lowercase
				if (!Array.isArray(obj.route.path)) {
					obj.route.path = [obj.route.path];							// if its not an array, make it an array of one
				}

				for (let i in obj.route.path) {
					if (path_contains_wildcard(obj.route.path[i])) {
						if (methods && methods.length > 0) {
							for (let x in methods) {
								let lc_method = methods[x].toLowerCase();
								if (!routes[lc_method]) {						// init, new method
									routes[lc_method] = [];
								}
								routes[lc_method].push(obj.route.path[i]);		// add path
							}
						}
					}
				}

			} else if (obj.name === 'router' || obj.name === 'bound dispatch') {
				const next_routes = exports.get_dynamic_routes(obj.handle);
				merge_routes(next_routes);
			}
		}

		merge_routes(append_routes);
		for (let method in routes) {
			routes[method] = [...new Set(routes[method])];						// make array have unique elements, do not sort, preserve order
		}
		return routes;

		function merge_routes(appendRoutes) {
			for (let method in appendRoutes) {
				if (!routes[method]) {
					routes[method] = [];										// init
				}
				routes[method] = routes[method].concat(appendRoutes[method]);	// add them at the end, preserve order
			}
		}
	};

	// test if this route should be ignored or not
	function ignore_this_route(path, method) {
		if (routes_2_ignore && path && method && routes_2_ignore[method]) {
			for (let i in routes_2_ignore[method]) {
				if (RegExp(routes_2_ignore[method][i]).test(path)) {
					return true;
				}
			}
		}
		return false;
	}

	// test if this str is a express wildcard route
	function path_contains_wildcard(str) {
		return RegExp(/\/:/).test(str) || RegExp(/\/[?*]+/).test(str);
	}

	// build interesting data, also build uninteresting data if thats too hard
	function build_metrics(data, days_summary) {
		const DATE = 0;			// the index of the date once we split the access string on spaces
		const METHOD = 3;
		const ROUTE = 4;
		const CODE = 6;
		const AGENT = 7;
		const TIME = 8;
		const metrics = {
			codes: {},
			routes: {},
			methods: {},
			user_agents: {},
			_days: isNaN(days_summary) ? 7 : Number(days_summary),	// defaults to 7 days
		};

		for (let i in data.http_access) {
			const parts = data.http_access[i].split(' ');		// split access log string
			const d = new Date(parts[DATE]);
			const elapsed = Date.now() - d.getTime();

			if (elapsed <= 1000 * 60 * 60 * 24 * metrics._days) {	// only work on recent access logs
				const http_code = parts[CODE];
				if (!metrics.codes[http_code]) {				// init
					metrics.codes[http_code] = 0;
				}
				metrics.codes[http_code]++;						// build metric on http status codes

				const r = parts[ROUTE] + ' ' + parts[METHOD];
				const time = Number(parts[TIME]);
				if (!metrics.routes[r]) {						// init
					metrics.routes[r] = {
						count: 0,
						avg_response_ms: 0
					};
				}
				metrics.routes[r].count++;						// build metrics on http routes
				metrics.routes[r].avg_response_ms = (metrics.routes[r].avg_response_ms * (metrics.routes[r].count - 1) + time) / metrics.routes[r].count;
				metrics.routes[r].avg_response_ms = Number(metrics.routes[r].avg_response_ms.toFixed(1));

				const method = parts[METHOD];
				if (!metrics.methods[method]) {					// init
					metrics.methods[method] = 0;
				}
				metrics.methods[method]++;						// build metrics on http methods

				const agent_hash = parts[AGENT];
				if (!metrics.user_agents[agent_hash] && data.seen_user_agents[agent_hash]) {
					metrics.user_agents[agent_hash] = {					// init
						str: data.seen_user_agents[agent_hash].str,		// copy from the raw data field
						hash: agent_hash,
						count: 0,
					};
				}
				if (metrics.user_agents[agent_hash]) {
					metrics.user_agents[agent_hash].count++;
				}
			}
		}

		data.last_x_days_metrics = t.misc.sortKeys(metrics);
		return data;
	}

	// build an object that will hold all browser user-agent strings, key each unique agent with a hash to avoid long access logs
	// ffs, the user-agent header is such a shit show, do your best to conform it to a hash
	exports.record_user_agent = (req) => {
		let hash = '0000';
		let user_agent = '?';
		if (req) {
			user_agent = req.get('user-agent');
			if (user_agent && typeof user_agent === 'string') {
				hash = make_agent_hash(user_agent.trim(), 0);
			}
		}

		if (hash.length < 4) {													// lengthen to 4 characters
			for (let i = hash.length; i < 4; i++) {
				hash = '0' + hash;
			}
		}
		if (hash.length > 4) {													// truncate to 4 characters
			hash = hash.substring(0, 4);
		}

		if (!access_logs.seen_user_agents[hash] && COLLECT_HTTP_ACCESS === true) {	// init
			access_logs.seen_user_agents[hash] = {
				str: user_agent,
				hash: hash,
			};
		}

		return hash;
	};

	// make a hash from user agent, prevents having to log such a long str in the access logs
	function make_agent_hash(str, attempt) {
		if (attempt > 100) {													// too many iterations, stuck, break out
			return '0000';
		}
		let hash = (Math.floor(Math.abs(t.misc.hash_str(str) % 100000)) - attempt).toString(16);	// I want a short hex string
		if (access_logs.seen_user_agents[hash] && access_logs.seen_user_agents[hash].str !== str) {	// this is a hash collision, try again
			return make_agent_hash(str, attempt + 1);							// try again by decrementing the hash's value
		}
		return hash;
	}

	return exports;
};
