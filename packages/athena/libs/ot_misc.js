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
// misc.js - OpTools Miscellaneous functions
//------------------------------------------------------------

module.exports = function (logger, t) {
	const exports = {};

	//------------------------------------------------------------
	// make api key for user doc
	//------------------------------------------------------------
	exports.gen_api_key = function (key, cb) {
		t.crypto.randomBytes(32, function (err, buffer) {	// make random pass
			const ret = {
				api: {
					key: key,
					secret: buffer.toString('hex')			// convert to hex for easier handling
				},
				last_visit_ts: Date.now(),
			};
			cb(null, ret);
		});
	};

	//detect if email address is an ibmer or not
	exports.isIbmEmail = function (email) {
		const isIbmer = ['.ibm.com', '@ibm.com'];			// try not to catch unforeseen external emails like... example@ibm.com
		if (email) {
			for (const i in isIbmer) {
				if (email.indexOf(isIbmer[i]) >= 0) { return true; }
			}
		}
		return false;
	};

	// look for the delete field, case-insensitive
	exports.has_delete_flag = function (obj) {
		if (obj) {
			if (obj.deleted || obj.DELETED) {
				return true;
			}
		}
		return false;
	};

	// detect if the obj is disabled/deactivated/canceled/inactive, return true if it is
	exports.is_disabled = function (obj) {
		if (!obj || obj.disabled || obj.DISABLED) {
			return true;
		}
		return false;
	};

	// restart athena - use caution! - note this function returns before the restart
	exports.restart_athena = function (uuid) {
		const date = t.misc.formatDate(Date.now(), '%Y/%M/%d-%H:%m:%s.%rZ');
		const LOG_PATH = 'logs/athena_restart.log';							// must match what is in server_watcher.js
		const restart_path = t.path.join(__dirname, '../' + LOG_PATH);

		logger.debug('---------------------------- restart ----------------------------');
		logger.info('Restarting Athena - imminent');
		logger.debug('---------------------------- restart ----------------------------');

		const message = date + ' - restarted via restart_athena() - uuid: ' + uuid;
		const orig_file = t.fs.existsSync(restart_path) ? t.fs.readFileSync(restart_path) : '';
		const new_file = keep_last_xxx_lines(orig_file.toString().trim() + '\n' + message, 100);
		t.fs.writeFileSync(restart_path, new_file);							// touching this file will restart us

		function keep_last_xxx_lines(text, keep_number) {
			const lines = text.split('\n');
			const remove = (lines.length - keep_number <= 0) ? 0 : lines.length - keep_number;
			const rolling = lines.slice(remove);							// keep the last xxx lines
			return rolling.join('\n');
		}
	};

	exports.start_graceful_shutoff = (cb) => {
		exports.close_server();
		logger.warn('[http] graceful shutoff has started, waiting a few seconds for requests to end...');
		setTimeout(() => {
			return cb();			// give time for connections to finish before moving on
		}, 4 * 1000);
	};

	//-------------------------------------------------------------
	// get the http status code from the request module's response
	//-------------------------------------------------------------
	exports.get_code = (obj) => {
		if (obj && obj.statusCode && !isNaN(obj.statusCode)) {
			return Number(obj.statusCode);
		}
		return 500;
	};

	//-------------------------------------------------------------
	// return true if the code is an error http status code
	//-------------------------------------------------------------
	exports.is_error_code = (code) => {
		code = Number(code);
		if (!isNaN(code)) {
			if (code >= 400) {
				return true;
			}
		}
		return false;
	};

	//-------------------------------------------------------------
	// format our response from request module's response
	//-------------------------------------------------------------
	exports.formatResponse = (resp) => {
		let ret = { error: 'resp is null' };			// default

		if (resp) {
			let parsed_body = null;
			try {
				parsed_body = JSON.parse(resp.body);
			} catch (e) {
				parsed_body = resp.body;
			}

			if (typeof parsed_body !== 'object') {
				ret = { response: parsed_body };
			} else if (parsed_body) {
				ret = parsed_body;
			}
		}

		const statusCode = exports.get_code(resp);
		if (exports.is_error_code(statusCode)) {		// error formats should have the statusCode
			ret.statusCode = statusCode;
		}
		return ret;
	};

	//-------------------------------------------------------------
	// Parse a proxy encoded url and break out base and path
	//-------------------------------------------------------------
	/*
	url = 'http://localhost:3000/grpcwp/http%3A%2F%2Fistillneedthisvm.rtp.raleigh.ibm.com%3A8081'
	opts: {
		default_proto: 'http',
		prefix: '/grpcwp/',
	}
	*/
	exports.parseProxyUrl = (url, opts) => {
		let proto = opts.default_proto;
		let temp = decodeURIComponent(url).substring(opts.prefix.length);		// strip off the "/grpcwp" part
		let no_proto = temp;

		const proto_pos = temp.indexOf('://');									// find http:// or https:// part
		if (proto_pos >= 0) {
			no_proto = temp.substring(proto_pos + 3);
			proto = temp.substring(0, proto_pos);								// grab the http:// or https:// part
		}

		let pos = no_proto.indexOf('/');										// find the next /
		let base2use = proto + '://' + no_proto;
		let path2use = '/';
		if (pos >= 0) {
			base2use = proto + '://' + no_proto.substring(0, pos);				// get the base url in the first half
			path2use = no_proto.substring(pos);									// and the path in the 2nd half
		}

		return { base2use: base2use, path2use: path2use };
	};

	//-------------------------------------------------------------
	// Check if url matches the url whitelist
	//-------------------------------------------------------------
	exports.validateUrl = (url, white_list_regex_array) => {
		const url_str = t.misc.fmt_url(url);
		if (url_str && Array.isArray(white_list_regex_array)) {
			for (let i in white_list_regex_array) {
				const regex = RegExp(white_list_regex_array[i]);
				const match = regex.test(url_str);
				if (match) {
					return true;
				}
			}
		}
		logger.warn('[ot_misc] this url was not found in safelist', encodeURI(url_str));
		return false;
	};

	//-------------------------------------------------------------
	// Decide if we want a https webserver or http
	//-------------------------------------------------------------
	exports.use_tls_webserver = (settings) => {
		if (settings && settings.HOST_URL && settings.HOST_URL.indexOf('https://') === 0) {
			return true;
		} else {
			return false;
		}
	};

	//-------------------------------------------------------------
	// Build the configtxlator url for apollo - if mixing https and http, use athena as a proxy to handle https -> http
	//-------------------------------------------------------------
	exports.build_configtxlator_url = (settings) => {
		if (settings && exports.use_tls_webserver(settings)) {
			if (settings.CONFIGTXLATOR_URL_ORIGINAL && settings.CONFIGTXLATOR_URL_ORIGINAL.indexOf('http://') === 0) {
				return t.misc.format_url(settings.HOST_URL) + '/configtxlator';		// send it to ourself instead
			}
		}
		settings.CONFIGTXLATOR_TIMEOUT = -1;
		return settings.CONFIGTXLATOR_URL_ORIGINAL;
	};

	//-------------------------------------------------------------
	// Get cert data. takes b64 PEM or PEM
	//-------------------------------------------------------------
	exports.parseCertificate = (base64_pem_cert) => {
		const c_parser = new t.js_rsa.X509();
		const cert_as_pem = decode_b64_pem(base64_pem_cert);
		let ret = {};

		try {
			c_parser.readCertPEM(cert_as_pem);
			const alt_names = c_parser.getExtSubjectAltName2();
			ret = {
				serial_number_hex: c_parser.getSerialNumberHex(),
				signature_algorithm: c_parser.getSignatureAlgorithmField(),
				issuer: c_parser.getIssuerString(),
				not_before_ts: formatDate2Ts(c_parser.getNotBefore()),
				not_after_ts: formatDate2Ts(c_parser.getNotAfter()),
				subject: c_parser.getSubjectString(),
				X509_version: c_parser.getVersion(),
				base_64_pem: t.misc.b64(cert_as_pem),
				time_left: '?',
				subject_alt_names: (alt_names && alt_names[0]) ? alt_names[0] : null,
				subject_parts: null,					// default
			};
		} catch (e) {
			logger.warn('[ot misc] unable to parse cert', e);
			return null;
		}
		ret.time_left = t.misc.friendly_ms(ret.not_after_ts - Date.now());
		ret.subject_parts = parse_subject_str(ret.subject);
		return t.misc.sortKeys(ret);

		// comes in as `200814180700Z` and need to get to this format '2020-08-14T18:07:00Z' to convert to ts
		function formatDate2Ts(date_str) {
			let today = new Date();						// lets guess that the first 2 digits of todays year (like YYYY) is the same as the certs date...
			let todays_year = today.getFullYear();
			let fmt = todays_year.toString().substring(0, 2) + date_str[0] + date_str[1] + '-' + date_str[2] + date_str[3] + '-' + date_str[4] + date_str[5];
			fmt += 'T' + date_str[6] + date_str[7] + ':' + date_str[8] + date_str[9] + ':' + date_str.substring(10);
			return new Date(fmt).getTime();
		}

		function decode_b64_pem(b64pem) {
			if (typeof b64pem === 'string' && b64pem.indexOf('-----BEGIN CERTIFICATE-----') >= 0) {
				return b64pem;
			} else {
				try {
					return t.misc.decodeb64(b64pem);		// decode it
				} catch (e) {
					logger.error('[ot misc] unable to base 64 decode cert');
					return b64pem;							// return it as is..
				}
			}
		}

		function parse_subject_str(subject_str) {
			const subject_parts = {};
			try {
				const parsed_parts = subject_str.split('/');
				for (let i in parsed_parts) {
					if (parsed_parts[i] && typeof parsed_parts[i] === 'string') {
						const field = parsed_parts[i].split('=');
						if (Array.isArray(field) && field.length >= 2) {
							const name = field[0];
							const value = field[1];
							subject_parts[name] = value;
						}
					}
				}
				return subject_parts;
			} catch (e) {
				logger.warn('[stitch] unable to parse subject in cert', e);
				return null;
			}
		}
	};

	//-------------------------------------------------------------
	// Build a postman collection file tailored for a user
	//-------------------------------------------------------------
	/*
	{
		url: 'https://example.com:3000'					// the url to use for all routes, include proto, hostname and port
		auth_type: 'basic',								// can be "basic", "api_key", or "bearer"

		// if auth_type === 'basic' use these fields:
		username: 'test',								// the OpTools basic auth username to use in all routes
		password: '1234',								// the OpTools basic auth password to use in all routes

		// if auth_type === 'bearer' use this field:
		token: 'blah.blah.blah',						// the IAM bearer token aka access token to use in all routes

		// if auth_type === 'api_key' use this field:
		api_key: 'gibberish',							// the IAM api key to use to use in all routes
	}
	*/
	exports.build_postman_collection = (opts) => {
		let collection = null;
		let reqs = 0;						// the number of postman requests we've built
		const errors = [];

		// find input errors
		const valid_types = ['basic', 'bearer', 'api_key'];
		if (!opts || !valid_types.includes(opts.auth_type)) {
			errors.push('missing or invalid input field "auth_type". must be one of:' + JSON.stringify(valid_types));
		}
		if (!opts || !opts.url) {
			errors.push('missing input field "url".');
		}
		if (!opts || !opts.input_collection_file) {
			errors.push('missing input field "input_collection_file".');
		}
		if (opts) {
			if (opts.auth_type === 'basic') {
				if (!opts.username) {
					errors.push('missing input field "username" for basic auth.');
				}
				if (!opts.password) {
					errors.push('missing input field "password" for basic auth');
				}
			} else if (opts.auth_type === 'bearer') {
				if (!opts.token) {
					errors.push('missing input field "token" for IAM bearer/access token auth');
				}
			} else if (opts.auth_type === 'api_key') {
				if (!opts.api_key) {
					errors.push('missing input field "api_key" for IAM api key auth');
				}
			}
		}

		// catch input errors
		if (errors.length > 0) {
			logger.error('[postman] unable to build due to bad input(s):', errors);
			return { errors: errors };
		}

		// make inputs safe for output
		if (opts.token) { opts.token = t.misc.safe_jwt_str(opts.token); }
		if (opts.api_key) { opts.api_key = t.misc.safe_jwt_str(opts.api_key); }	// run api_key through safe jwt, it'll work for this field too
		if (opts.username) { opts.username = t.misc.safe_username_str(opts.username); }
		if (opts.password) { opts.password = t.misc.safe_username_str(opts.password); }	// use username filter on password, safe

		// decide what type of collection we are building
		const auth_to_collection_map = {
			basic: 'software',				// we are building a software collection
			bearer: 'saas',					// we are building a saas collection
			api_key: 'saas'					// ^^
		};
		const collection_type = auth_to_collection_map[opts.auth_type];

		// read the file
		try {
			const txt = t.fs.readFileSync(opts.input_collection_file, 'utf8');
			collection = JSON.parse(txt);
		} catch (e) {
			logger.error('[postman] unable to read & parse input file', e);
		}

		if (collection) {
			delete collection.info._postman_id;						// remove the internal id
			collection.info.name = 'IBP console - ' + opts.auth_type + ' authorization';	// rename the collection
			collection.item = walk_folders(collection, 0, opts);	// rebuild the requests in the collection
			collection.info.description = build_overall_description(collection.info.description);

			logger.debug('[postman] build successful');
			return collection;
		}

		logger.warn('[postman] unable to build collection, error is above');
		return { error: 'unable to read master collection file' };


		// walk the postman format's folders, get to a request - recursive
		function walk_folders(col, depth, opts) {
			const items2keep = [];

			if (depth > 100) {
				logger.error('[postman] too deep, stuck in a loop?');
				return null;
			}

			for (let i in col.item) {											// walk each item array
				if (col.item[i].item) {											// if there is another "item" field its a folder
					if (opts.debug) { logger.debug('[postman] found a folder: "' + col.item[i].name + '"'); }
					const inner = walk_folders(col.item[i], ++depth, opts);
					if (Array.isArray(inner) && inner.length > 0) {
						items2keep.push({
							name: col.item[i].name,
							item: inner
						});
					}
				} else {
					if (!col.item[i].request) {									// malformed, log and ignore
						logger.error('[postman] what type of request is this?', col.item[i].name);
					} else {

						// we only want the ak apis and ones that don't have certain words in it
						if (!is_an_ak_api(col.item[i].request) || name_has_tag_2_skip(col.item[i].name, collection_type)) {
							if (opts.debug) { logger.debug('[postman] skipping req: "' + col.item[i].name + '"'); }
						} else {
							if (opts.debug) { logger.debug('[postman]', ++reqs, '- found an ak req: "' + col.item[i].name + '"'); }
							col.item[i].name = col.item[i].name.replace(/\([^)]\)/g, '');	// remove all tags in the request name
							replace_auth(col.item[i].request, opts);
							replace_location(col.item[i].request, { url: opts.url });
							items2keep.push(col.item[i]);
						}
					}
				}
			}

			return items2keep;
		}

		// edit the overall description and remove text for auth that is n/a
		function build_overall_description(description) {
			const str1 = '## Authorization for SaaS (IBP console session)';
			const str2 = '## Authorization for SaaS (IAM bearer)';
			const str3 = '## Authorization for SaaS (IAM api key)';
			const str4 = '## Authorization for Software (IBP console basic auth)';
			const pos1 = description.indexOf(str1);
			const pos2 = description.indexOf(str2);
			const pos3 = description.indexOf(str3);
			const pos4 = description.indexOf(str4);

			if (opts.auth_type === 'bearer') {
				const first_half = description.substring(0, pos1);
				const second_half = description.substring(pos2, pos3);
				return first_half + second_half;
			} else if (opts.auth_type === 'api_key') {
				const first_half = description.substring(0, pos1);
				const second_half = description.substring(pos3, pos4);
				return first_half + second_half;
			} else if (opts.auth_type === 'basic') {
				const first_half = description.substring(0, pos1);
				const second_half = description.substring(pos4);
				return first_half + second_half;
			}

			return null;
		}

		// see if the request name has a tag that means we should not export it
		function name_has_tag_2_skip(req_name, collection_type) {
			const tags_2_skip = {									// these are strings that exist in the name of the request in the master collection
				saas: ['(skip-me)', '(legacy)', '(unused)', '(software-only)'],
				software: ['(skip-me)', '(legacy)', '(unused)', '(SaaS)'],
			};

			if (tags_2_skip[collection_type]) {
				for (let i in tags_2_skip[collection_type]) {
					if (req_name.includes(tags_2_skip[collection_type][i])) {		// if it has it, do not include the request
						return true;
					}
				}
			}
			return false;
		}

		// replace the auth for this request
		function replace_auth(req, opts) {
			if (req && req.auth && req.auth.type === 'basic' && req.auth.basic) {	// only replacing basic auth

				// change basic auth
				if (opts.auth_type === 'basic') {									// if its already basic, just replace the fields
					for (let i in req.auth.basic) {									// its an array... look for the fields
						if (req.auth.basic[i].key === 'username') {
							req.auth.basic[i].value = opts.username;
						} else if (req.auth.basic[i].key === 'password') {
							req.auth.basic[i].value = opts.password;
						} else if (req.auth.basic[i].key === 'showPassword') {		// always hide user's password
							req.auth.basic[i].value = false;
						}
					}
				}

				// change auth to bearer token
				else if (opts.auth_type === 'bearer') {
					delete req.auth.basic;
					req.auth.type = 'bearer';										// change auth type
					req.auth.bearer = [
						{
							key: 'token',
							value: opts.token,										// add the token
							type: 'string'
						}
					];
				}

				// change auth to api key
				else if (opts.auth_type === 'api_key') {
					req.auth = { type: 'noauth' };									// change auth type
					let auth_header_pos = -1;

					if (!req.header) {
						req.header = [];
					}
					for (let i in req.header) {										// its an array... look for the authorization entry
						if (req.header[i].key === 'Authorization') {
							auth_header_pos = i;									// remember the spot
							break;
						}
					}

					if (auth_header_pos === -1) {									// if it dne yet, put it in the next position
						auth_header_pos = req.header.length;
					}
					req.header[auth_header_pos] = {
						key: 'Authorization',
						value: 'ApiKey ' + opts.api_key,							// add the api key
						type: 'text'
					};
				}
			}
		}

		// see if this an api key api or a session one
		function is_an_ak_api(req) {
			if (req && req.url && req.url.raw) {
				const orig_parsed = t.misc.break_up_url(req.url.raw);
				if (orig_parsed.path.indexOf('/ak/') === 0) {
					return true;
				}
			}
			return false;
		}

		// replace the hostname in the original collection with the athena server url
		function replace_location(req, opts) {
			if (req && req.url && req.url.raw) {
				const orig_parsed = t.misc.break_up_url(req.url.raw);
				const new_parsed = t.misc.break_up_url(opts.url);
				req.url.raw = opts.url + orig_parsed.path;
				req.url.protocol = new_parsed.protocol.substring(0, new_parsed.protocol.length - 1);		// remove the trailing colon
				req.url.host = [new_parsed.hostname];
				req.url.port = new_parsed.port;
				req.url.path = orig_parsed.path.substring(1).split('/');
			}
		}
	};

	// detect if request wants to use the cache or not - from query param
	exports.skip_cache = function (req) {
		if (req && req.query && req.query.cache === 'skip') {
			return true;
		}
		if (req && req.query && req.query.skip_cache === 'yes') {		// legacy
			return true;
		}
		if (req && req._skip_cache === true) {		// manual
			return true;
		}
		return false;
	};

	// print logger message warning about deprecated api
	exports.legacy_warning = (req) => {
		if (req && req.url) {
			logger.warn('[legacy warning] the api: ' + req.url + ' is deprecated. consider moving to /v2/ if applicable.');
		}
	};

	// return a username that is safe to log
	exports.get_username_for_log = (req) => {
		const email = t.middleware.getEmail(req);
		let id = email ? email : t.middleware.getUuid(req);	// prefer the email, else username

		const censored = t.misc.censorEmail(id);			// censor email or username (username might be an email...)
		if (censored !== 'unknown_email') {
			return censored;
		} else {
			return id;										// if we couldn't censor the email, its probably not an email, return as is
		}
	};

	// -----------------------------------------------------------------
	// returns ca id that signed root cert in msp
	/* opts: {
			msp_root_cert: "<base 64 pem format>",			// [required]
			root_certs_by_ca: {
				ca_id: "<base 64 pem format>",				// [required]
			}
	}*/
	// -----------------------------------------------------------------
	exports.find_ca_for_msp = (opts) => {
		for (let ca_id in opts.root_certs_by_ca) {
			const options = {
				certificate_b64: opts.msp_root_cert,
				root_certs_b64: [opts.root_certs_by_ca[ca_id]],
				debug_tag: 'ca_id: ' + ca_id
			};
			if (t.misc.is_trusted_certificate(options)) {
				return ca_id;
			}
		}
		return null;
	};

	//--------------------------------------------------
	// Get or create a transaction id for the http request - any somewhat-unique string will do. (shorter strings ares easier to read)
	//--------------------------------------------------
	exports.buildTxId = (req) => {
		const LEN = 5;
		if (!req) {
			return '!:' + t.misc.simpleRandomString(LEN);						// (error) req should always exist, but handle it anyway
		} else if (req._tx_id) {
			return req._tx_id;													// if we already have an id, return it
		} else if (req.params && req.params.debug_tx_id && typeof req.params.debug_tx_id === 'string') { // user can submit their own tx id
			return req.params.debug_tx_id;										// added this to match existing code in deployer_lib.js that allowed input param
		} else {
			const pid = t.middleware.getPartialSessionId(req);						// get first couple characters of the session id
			if (typeof pid !== 'string') {
				return '#:' + t.misc.simpleRandomString(LEN);					// (error) pid should always be a string, but just in case handle it
			} else {
				const shorter_pid = (pid === '-') ? '-' : pid.substring(1);		// id is '-' if the session dne yet
				return shorter_pid + ':' + t.misc.simpleRandomString(LEN);		// remove the first character, b/c its always 's', which is not helpful
			}
		}
	};

	//--------------------------------------------------
	// Return true if fabric version is v2.*.* || 2.*.*
	//--------------------------------------------------
	exports.is_fabric_v2 = (comp_data) => {
		if (comp_data && comp_data.version) {
			const regex_v2 = RegExp(/^v?[2].\d+.\d+/, 'i');
			return regex_v2.test(comp_data.version);
		}
		return null;
	};

	//--------------------------------------------------
	// Return the default fabric version from deployer api response
	//--------------------------------------------------
	exports.find_default_version = (available_versions, lc_type) => {
		if (available_versions && available_versions[lc_type]) {
			for (let version in available_versions[lc_type]) {
				if (available_versions[lc_type][version].default === true) {
					return version;
				}
			}
		}
		return null;
	};

	//--------------------------------------------------
	// Parse the version.txt file and return as json
	//--------------------------------------------------
	exports.parse_versions = () => {
		let version_file = null;
		try {
			let temp = t.fs.readFileSync(t.path.join(__dirname, '../public/version.txt'), 'utf8');
			temp = temp.trim().replace(/\r\n/g, '\n').split('\n');
			version_file = {};
			for (let i in temp) {
				const parts = temp[i].split(':');
				version_file[parts[0]] = parts[1];
			}
		} catch (e) { }

		if (!version_file || Object.keys(version_file).length < 2) {
			return try_package_file();
		} else {
			return version_file;
		}

		// fall back to version in package file
		function try_package_file() {
			const ret = {};
			try {
				let athena_package = t.fs.readFileSync(t.path.join(__dirname, '../package.json'));
				athena_package = JSON.parse(athena_package);
				ret.tag = athena_package.version;
				return ret;
			} catch (e) {
				return null;
			}
		}
	};

	// -----------------------------------------------------------------
	// helpers around graceful shutoff of the optools server
	// -----------------------------------------------------------------
	const YES = 'yes';
	const NOPE = 'no';
	exports.open_server = () => {
		logger.info('[http] server is open to new requests');
		process.env.OPTOOLS_OPEN_FOR_REQS = YES;
	};

	exports.close_server = () => {
		logger.warn('[http] server is closed to new requests');
		process.env.OPTOOLS_OPEN_FOR_REQS = NOPE;
	};

	exports.server_is_closed = () => {
		return process.env.OPTOOLS_OPEN_FOR_REQS === NOPE;
	};

	// -----------------------------------------------------------------
	// safely generate and write self signed tls certificate to the file system - returns error obj if there was one
	// -----------------------------------------------------------------
	/*
	const opts = {
		common_name: hostname,
		alt_names_array: [hostname, t.misc.get_host(envs.PROXY_TLS_WS_URL)],
		org_name: envs.STR.TLS_CERT_ORG
	};
	*/
	exports.setup_self_signed_tls = (opts) => {
		const temp_key_filename = process.env.KEY_FILE_PATH + '.temp';
		const temp_cert_filename = process.env.PEM_FILE_PATH + '.temp';
		const gen_errors = create_temp_files();
		if (gen_errors) {
			return gen_errors;
		} else {
			return replace_tls_files();					// if there were errors, the original files were not replaced
		}

		// create the tls files, use _temp to not lose the originals yet
		function create_temp_files() {
			const pems = generate_self_signed_tls(opts);
			if (!pems || !pems.private || !pems.public || !pems.cert) {
				logger.warn('[tls] unable to generate self signed tls cert');
				return { error: 'could not generate tls files' };
			} else {

				// if we have the cert info, write them to the file system
				try {
					t.misc.check_dir_sync({ file_path: temp_key_filename, create: true });		// check if the path exists, create it if not
					t.misc.check_dir_sync({ file_path: temp_cert_filename, create: true });
					t.fs.writeFileSync(temp_key_filename, pems.private);
					t.fs.writeFileSync(temp_cert_filename, pems.cert);
					return null;
				} catch (e) {
					logger.error('[tls] could not write the generated tls cert files to fs:', e);
					return { error: 'could not write new generated tls files to fs' };
				}
			}
		}

		// have the temp files replace the original files if they are good - returns error obj if there was one
		function replace_tls_files() {
			let key_file = null;
			let cert_file = null;
			let orig_key_file = null;

			// first read the key file incase we need to revert - they might not always exist
			try {
				orig_key_file = t.fs.readFileSync(process.env.KEY_FILE_PATH);
			} catch (e) { }

			// then read the newly generated tls files - must exist
			try {
				key_file = t.fs.readFileSync(temp_key_filename);
				cert_file = t.fs.readFileSync(temp_cert_filename);
			} catch (e) { }

			// then check if the new ones are okay
			if (exports.auto_tls_cert_near_expiration(temp_cert_filename, opts.org_name) === true) {
				return { error: 'tls cert is malformed or dne or expired' };
			} else if (key_file === null) {
				return { error: 'tls key is malformed or dne' };
			} else {
				try {
					t.fs.writeFileSync(process.env.KEY_FILE_PATH, key_file);		// replace the tls key
				} catch (e) {
					logger.error('[tls] could not replace tls key file on fs:', e);
					return { error: 'could not replace tls key' };
				}

				try {
					t.fs.writeFileSync(process.env.PEM_FILE_PATH, cert_file);		// replace the tls cert
				} catch (e) {
					logger.error('[tls] could not replace tls cert file on fs:', e);
					undo(orig_key_file);											// since the key was already replaced, we need to undo that
					return { error: 'could not replace tls cert' };
				}
				logger.info('[tls] success - stored the generated key and cert to fs:', process.env.PEM_FILE_PATH);
				return null;
			}
		}

		// put the key file back - this is needed if say the key was replaced but the cert failed to replace during the write
		function undo(original_key_file) {
			if (original_key_file) {
				try {
					logger.warn('[tls] undoing tls key replacement...');
					t.fs.writeFileSync(process.env.KEY_FILE_PATH, original_key_file);
				} catch (e) {
					logger.error('[tls] yikes, the undo failed too, the tls key and cert will need to be regenerated:', e);
				}
			}
		}

		// generate a self signed tls certificate from common/alt names
		function generate_self_signed_tls(opts) {
			const fmt_alt_names = [];
			const alt_names_array = [...new Set(opts.alt_names_array)];			// make array of strings unique
			for (let i in alt_names_array) {
				const name_type = is_ip(alt_names_array[i]) ? 7 : 2;			// type 7 is ip, type 2 is hostname (no protocol)
				fmt_alt_names.push({ type: name_type, value: alt_names_array[i] });
			}
			const extensions = [
				{ name: 'subjectAltName', altNames: fmt_alt_names },
				{ name: 'extKeyUsage', serverAuth: true }						// OSX Catalina needs this extension
			];

			try {
				const attrs = [
					{ name: 'countryName', value: 'US' },
					{ name: 'stateOrProvinceName', value: 'North Carolina' },
					{ name: 'localityName', value: 'Durham' },
					{ name: 'commonName', value: opts.common_name },
					{ name: 'organizationName', value: opts.org_name },
					{ name: 'organizationalUnitName', value: 'Blockchain' },

					// don't send email anymore 12/01/2020. b/c `PrintableString` type (which the "selfsigned" lib uses w/email) cannot have `@` or `*` chars.
					// certs with these characters in this field type fail Go's tls cert parsing, making go unable to call our APIs w/TLS
					//{ name: 'emailAddress', value: 'dsh**@ibm.com' },
				];
				logger.info('[tls] generating using commonName: "' + opts.common_name + '", altNames:', fmt_alt_names);

				const gen_opts = { days: 365 * 2, keySize: 2048, algorithm: 'sha256', extensions: extensions };	// OSX Catalina needs < 825 days
				return t.selfsigned.generate(attrs, gen_opts);
			} catch (e) {
				logger.error('[tls] could not generate self signed certs for tls:', e);
			}
			return null;

			// returns true if the url contains an ip with TLS (urls w/hostname or http should return false)
			function is_ip(str) {
				const regex = RegExp(/\d+\.\d+\.\d+\.\d+/);				// ip format
				if (str && typeof str === 'string') {
					return regex.test(str);
				}
				return false;
			}
		}
	};

	// -----------------------------------------------------------------
	// generate logs if server's tls cert is near expiration
	// -----------------------------------------------------------------
	exports.cert_expiration_warning = (cert) => {
		const parsed_tls = exports.parseCertificate(cert);
		if (parsed_tls && parsed_tls.not_after_ts) {
			const days_left = (parsed_tls.not_after_ts - Date.now()) / (1000 * 60 * 60 * 24);
			const DAYS_TO_ANNOY = 60;
			if (days_left <= DAYS_TO_ANNOY) {
				for (let i = 0; i < DAYS_TO_ANNOY - days_left; i += 4) { logger.warn('---- warn ----'); }	// make a block of annoying logs
				if (days_left <= 0) {
					logger.error('[tls] whoa there buddy, the IBP console TLS cert has expired.');
				} else {
					logger.error('[tls] whoa there buddy, the IBP console TLS cert will expire soon. consider renewing it before things get weird');
				}
				// the longer they wait the more painful this is
				for (let i = 0; i < DAYS_TO_ANNOY - days_left; i += 4) { logger.warn('---- warn ----'); }
			}
		}
	};

	// -----------------------------------------------------------------
	// regenerate and replace existing tls key and cert - uses couchdb locks to synchronize multiple athena instances
	// -----------------------------------------------------------------
	/* opts = {
			common_name: hostname,
			alt_names_array: [hostname, t.misc.get_host(ev.PROXY_TLS_WS_URL)],
			email: ev.ADMIN_CONTACT_EMAIL,
			org_name: ev.STR.TLS_CERT_ORG,			// never pass asterisks here
			_lock_name: ev.STR.TLS_LOCK_NAME
	};*/
	exports.regen_tls_cert = (opts, attempt, cb) => {
		logger.warn('[tls] regenerating tls cert, attempt:', attempt);
		if (attempt >= 5) {
			logger.error('[tls] too many attempts to regenerate tls, giving up.');
			return cb();
		} else if (opts.email && opts.email.includes('*')) {
			logger.error('[tls] cannot generate tls cert, email field cannot contain "*"', opts.email);
			return cb();
		} else {
			t.lock_lib.apply({ lock: opts._lock_name, max_locked_sec: 20 }, (lock_err) => {
				if (lock_err) {
					logger.debug('[tls] did not win the tls lock, waiting to try again...');
					setTimeout(() => {
						return exports.regen_tls_cert(opts, ++attempt, cb);		// try again in a bit
					}, 10 * 1000);
				} else {
					logger.debug('[tls] won lock. will generate new tls cert/key.');
					const tls_replace_errors = exports.setup_self_signed_tls(opts);
					t.lock_lib.release(opts._lock_name);						// cert is regenerated, move on

					// don't restart if we had errors replacing, nothing changed
					if (tls_replace_errors === null) {
						logger.warn('[tls] sending restart message so other instance pick up new tls cert');
						const msg = {
							message_type: 'restart',
							message: 'restarting application b/c tls cert was regenerated',
							by: 'system',
							uuid: 'system',
						};
						t.pillow.broadcast(msg);	// restart athenas (might not be needed, but this should make it happy)
					}
					return cb();
				}
			});
		}
	};

	// -----------------------------------------------------------------
	// returns true if the tls server cert in use was OUR auto generated one && its close to expiration
	// -----------------------------------------------------------------
	exports.auto_tls_cert_near_expiration = (cert_filename, athenas_tls_org) => {
		let parsed_tls = null;
		try {
			let path = '';
			if (cert_filename[0] === '/' || cert_filename[0].toLowerCase() === 'c') {
				path = cert_filename;
			} else {
				path = t.path.join(__dirname, '../' + cert_filename);
			}
			parsed_tls = exports.parseCertificate(t.fs.readFileSync(path));
		} catch (e) {
			logger.error('[tls] unable to parse tls cert, error[1]:', cert_filename, e);
		}

		if (!parsed_tls || !parsed_tls.not_after_ts || !parsed_tls.subject_parts) {
			return false;									// error already logged
		} else {
			logger.debug('[tls] the server\'s tls cert expires in:', parsed_tls.time_left);

			if (parsed_tls.subject_parts.O !== athenas_tls_org) {		// auto-built tls certs will use a hard coded org
				logger.warn('[tls] the server\'s tls cert was *not* built automatically, so if it needs to be renewed it must be done manually.'
					, parsed_tls.subject_parts.O);
				return false;								// its not our cert, don't renew this, its up to them
			} else {
				const days_left = (parsed_tls.not_after_ts - Date.now()) / (1000 * 60 * 60 * 24);
				const WHEN_TO_REGENERATE = 15;				// regenerate the cert when it has this many days or less
				if (days_left > WHEN_TO_REGENERATE) {
					return false;							// cert is fine, move on
				} else {
					return true;							// cert should be regenerated
				}
			}
		}
	};

	// -----------------------------------------------------------------
	// returns true if the tls server cert in use was OUR auto generated one && it has asterisks or @ chars in the "PrintableString" fields
	// -----------------------------------------------------------------
	exports.tls_cert_has_invalid_chars = (cert_filename, athenas_tls_org) => {
		let parsed_tls = null;
		try {
			let path = '';
			if (cert_filename[0] === '/' || cert_filename[0].toLowerCase() === 'c') {
				path = cert_filename;
			} else {
				path = t.path.join(__dirname, '../' + cert_filename);
			}
			parsed_tls = exports.parseCertificate(t.fs.readFileSync(path));
		} catch (e) {
			logger.error('[tls] unable to parse tls cert, error[2]:', cert_filename, e);
		}

		if (!parsed_tls || !parsed_tls.not_after_ts || !parsed_tls.subject_parts) {
			return false;														// error already logged
		} else {
			logger.debug('[tls] server\'s tls cert details - CN: "' + parsed_tls.subject_parts.CN + '" E: "' + parsed_tls.subject_parts.E +
				'" O: "' + parsed_tls.subject_parts.O + '"');

			if (parsed_tls.subject_parts.O !== athenas_tls_org) {				// its not an auto-generated cert, skip check
				return false;
			} else {
				// E = email (we no longer set email in regen, only found in older certs)
				// O = organization name
				const fields = ['E', 'O'];								// all "PrintableString" field types in the auto-generated certs
				for (let i in fields) {
					const field = fields[i];
					if (parsed_tls.subject_parts[field]) {
						if (parsed_tls.subject_parts[field].includes('@') || parsed_tls.subject_parts[field].includes('*')) {
							logger.error('[tls] server\'s tls cert has invalid character, will regenerate it. field:', field, parsed_tls.subject_parts[field]);
							return true;										// cert has invalid character, likely from our past bug, regenerate
						}
					}
				}
				return false;													// cert is fine, move on
			}
		}
	};

	// -----------------------------------------------------------------
	// return a couchdb doc id for a swagger file
	// -----------------------------------------------------------------
	exports.build_swagger_id = (swagger_json) => {
		if (!swagger_json || !swagger_json.info || !swagger_json.info.version) {
			return null;
		} else {
			return '01_validation_ibp_openapi_' + swagger_json.info.version;
		}
	};

	// detect an api key route
	exports.detect_ak_route = function (req) {
		if (req && req.url && req.url.indexOf('/ak') === 0) {
			return true;
		}
		return false;
	};

	// -----------------------------------------------------------------
	// get the api version in the route/path - returns string like 'v2'
	// -----------------------------------------------------------------
	exports.get_api_version = function (req) {
		const version_regex = [
			'^/ak/api/(v\\d+)',
			'^/api/saas/(v\\d+)',
			'^/api/(v\\d+)'
		];

		if (req && req.path) {
			for (let i in version_regex) {
				const regex = new RegExp(version_regex[i]);
				const matches = req.path.match(regex);
				if (matches && matches[1]) {
					return matches[1];
				}
			}
		}
		return null;
	};

	// -----------------------------------------------------------------
	// detect a v2+ api route - this replaced is_v2_route()
	// -----------------------------------------------------------------
	exports.is_v2plus_route = function (req) {
		const version = exports.get_api_version(req);
		const version_number = (typeof version === 'string') ? Number(version.substring(1)) : 0;	// defaults 0
		if (version_number >= 2) {
			return true;
		} else {
			return false;
		}
	};

	// -----------------------------------------------------------------
	// detect a v3+ api route
	// -----------------------------------------------------------------
	exports.is_v3plus_route = function (req) {
		const version = exports.get_api_version(req);
		const version_number = (typeof version === 'string') ? Number(version.substring(1)) : 0;	// defaults 0
		if (version_number >= 3) {
			return true;
		} else {
			return false;
		}
	};

	// -----------------------------------------------------------------
	// detect if body indicates an orderer without a system channel
	// -----------------------------------------------------------------
	exports.is_systemless_req = function (body) {
		if (body) {
			return (body.channelless === true || body.systemless === true);
		} else {
			return false;
		}
	};

	//--------------------------------------------------
	// wait for the fabric component to start
	//--------------------------------------------------
	/* opts: {
		comp_doc: {},
		desired_max_ms: 10000,					// timeout for all retries of the status api check
		timeout: 5000,							// timeout for a single status api check
	}*/
	exports.wait_for_component = (opts, cb) => {
		const interval_ms = 10 * 1000;			// it wants ms
		opts.desired_max_ms = opts.desired_max_ms || 5000;
		opts.timeout = opts.timeout || 5000;
		opts.desired_max_ms = isNaN(opts.desired_max_ms) ? 90000 : Number(opts.desired_max_ms);
		const started = Date.now();

		const attempts = Math.ceil(opts.desired_max_ms / interval_ms);
		logger.debug('*[wait] starting polling to wait for component to start... max attempts:', attempts, opts.comp_doc._id);
		let on_attempt = 0;

		t.async.retry({
			times: attempts,
			interval: interval_ms,				// it wants ms
		}, (done) => {
			const log_attempts = 'on attempt: ' + (++on_attempt) + '/' + attempts;
			const options = {
				skip_cache: true,
				_max_attempts: 1,
			};
			t.component_lib.get_status(opts.comp_doc, options, (resp) => {
				const code = exports.get_code(resp);
				if (exports.is_error_code(code)) {
					logger.warn('*[wait] - could not reach component yet:', opts.comp_doc._id, code, log_attempts);
					return done('cannot reach component');
				} else {
					logger.debug('*[wait] - component is alive', opts.comp_doc._id, code, log_attempts);
					return done(null);
				}
			});
		}, (err, body) => {
			if (err) {
				const elapsed = Date.now() - started;
				const log_attempts = 'attempt: ' + on_attempt + '/' + attempts;
				logger.warn('[wait] - could not reach component. giving up after', t.misc.friendly_ms(elapsed), opts.comp_doc._id, log_attempts);
			}
			return cb(err, body);
		});
	};

	return exports;
};
