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
//=======================================================================================================
// Validate user input from API using a swagger file
//=======================================================================================================
// notes:
// - only validate user input, not derived data, b/c it makes less confusing error messages
// - don't make this real middleware, b/c you need to fudge the path first, else you won't find the right validation
// - For regular expression checks, the swagger has the expression's name and the list of regex's can be found in default_settings_doc.json.
// - b/c of how switchKey (the force key-case logic) works, no logic can deep copy/clone objects in the request body. else it will fail to switch keys in body.
/*
	opts: {
		file_names: {									// [optional] load swagger files from path
			"v2":	"./json_docs/swagger.yml",
			"v2":	"./json_docs/swagger.yml",
		},
		files: {										// [optional] load swagger files by providing them
			"v2": "",
			"v3": "",
		}
	}
*/

/*
	enforces these swagger validation options:

	required
		- array of strings. applies to all types. field must be present, null/false okay.
	maximum, minimum
		- number. applies to number types. min/max numeric value for input.
	enum
		- array of possible values. applies to any type. only the values in this array are valid inputs. === is used to compare.
	minLength, maxLength
		- number. applies to string and array types. min/max character/element count.
	x-maximum, x-minimum
		- number. applies to string types. min/max numeric value for input.
		- I had to make this field instead of reusing 'maximum' / 'minimum' b/c IBM Cloud swagger validator is old and won't accept max/min  on strings
	x-validate_regex_must_pass
		- string. applies to string types. regex must return true during a regex.test().
	x-validate_regex_must_fail
		- string. applies to string types. regex must return false during a regex.test().
	x-validate_regex_error_msg
		- string. the error message to use when either x-validate_regex_must_pass or x-validate_regex_must_fail indicates a bad input.
	x-validate_illegal_keys
		- array of strings. applies to object types. the name of fields that cannot exist at this level in the input.
	x-validate_illegal_values
		- array of strings. applies to strings. string values that are illegal for this input.
	x-validate_no_extra_keys
		- bool. applies to all types. if true, undocumented keys in this object will generate an error.
	x-validate_base64_certificate
		- bool. applies to string types. must be a base 64 encoded PEM string
	x-validate_cpu
		- bool. applies to string types. validates the units of a cpu field.
		- maximum, minimum are also used to bound the number if available (input is converted to CPUs before bounding check)
	x-validate_memory
		- bool. applies to string types. validates the units of a memory field.
		- maximum, minimum are also used to bound the number if available (input is converted to bytes before bounding check)
	x-validate_storage
		- bool. applies to string types. validates the units of a storage/disk field.
		- maximum, minimum are also used to bound the number if available (input is converted to bytes before bounding check)
	x-validate_duration
		- bool. applies to string types. will validate the units of the time field (h, m, s)
		- maximum, minimum are also used to bound the number if available (input is converted to ns before bounding check)
	x-validate_matching_lengths
		- string. applies to array types. will validate if this array is the same length as another array.
	x-validate_key_combination
		- object. applies to any type. will validate this field in relation to other fields.
		- valid sub-properties: "key_should_exist", "key_should_not_exist"
	x-validate_paid_plan_feature
		- boolean. applies to any type. validates if this field is only for paid k8s plans
	x-validate_invalid_params_for_import
		- boolean. applies to query parameters. validates the query parameters provided. against the component being edited in this api.
		- will generate an error if component was imported && query parameter is invalid for imported components.
	x-validate_comp_not_imported
		- boolean. applies to the whole api.
		- will generate an error if component was imported. b/c that's an invalid api for imported components.
	x-validate_case_insensitive: true
		- boolean. applies to keys in an object type. it means the text of this key can be in any case (uppercase/lowercase/mixed).
	x-validate_overwrite_key: "SomeSpecificCase"
		- string. the exact name of the key to use for this field. this overwrites the key name in the request's body!
		- this param is to be used in conjunction with `x-validate_case_insensitive` param. Helps set fields that are compatible with Fabric's expectations.
	x-validate_only_one_key:
		- string -> "ak" or "all". applies to keys in an object type. this means to only allow 1 root field in the object.
		- a value of "ak" means this restriction only applies to api key routes (/ak/ routes).
		- a value of "all" means this restriction applies to /ak/ and internal (apollo) routes.
	x-validate_known_hostname:
		- string. applies to enrollment "host" fields when deploying components
		- will generate an error if this hostname is not in the whitelist
	x-validate_breaking_version_upgrade:
		- object. applies to string types. validates if a breaking fabric upgrade is being requested. this field contains the rules.
		- will generate an error if the current version and desired version match a breaking upgrade rule.
*/
module.exports = (logger, ev, t, opts) => {
	const validate = {};
	let flat_swag = {
		v2: {
			validate_error_messages: {},				// field is set later, will hold error message formats
			paths: {},									// field is set later, all paths get set here, all $refs all flattened, thus no need to lookup $refs
		},
		v3: {
			validate_error_messages: {},				// field is set later, will hold error message formats
			paths: {},									// field is set later, all paths get set here, all $refs all flattened, thus no need to lookup $refs
		}
	};
	opts = opts ? opts : {};						// init

	//-------------------------------------------------------------
	// load a swagger json/yaml files from paths
	//-------------------------------------------------------------
	validate.load_swagger_paths = (swagger_file_paths) => {
		let obj = null;
		for (let ver in swagger_file_paths) {
			try {
				obj = parse_to_json(t.fs.readFileSync(swagger_file_paths[ver], 'utf8'));
			} catch (e) {
				logger.error('\n');
				logger.error('[validate] unable to load file from path. e:', e);
				logger.error('\n');
				return null;
			}
			flat_swag[ver] = flatten_swagger_json(obj);
		}
	};

	//-------------------------------------------------------------
	// load a swagger json/yaml via file contents
	//-------------------------------------------------------------
	validate.load_swaggers = (swagger_files) => {
		let obj = null;
		for (let ver in swagger_files) {
			try {
				obj = parse_to_json(swagger_files[ver]);
			} catch (e) {
				logger.error('\n');
				logger.error('[validate] unable to load file. e:', e);
				logger.error('\n');
				return null;
			}
			flat_swag[ver] = flatten_swagger_json(obj);
		}
	};

	// parse yaml to json (if its a string), else return obj
	function parse_to_json(thing) {
		if (typeof thing === 'object') {
			return thing;
		} else {
			try {
				return t.yaml.safeLoad(thing);
			} catch (e) {
				logger.error('[validate] unable to convert yaml to json. e:', e);
			}
		}
		return null;
	}

	// flatten the swagger json
	function flatten_swagger_json(obj) {
		const temp = {
			validate_error_messages: [],
			paths: {},
			version: '-'
		};
		if (obj) {
			temp.validate_error_messages = obj['x-validate_error_messages']; 	// copy the error messages
			temp.version = obj.info ? obj.info.version : '-';					// copy version
			for (let route in obj.paths) {
				for (let method in obj.paths[route]) {
					const lc_route = route ? route.toLowerCase() : null;
					const lc_method = method ? method.toLowerCase() : null;
					if (!temp.paths[lc_route]) { temp.paths[lc_route] = {}; }	// init
					temp.paths[lc_route][lc_method] = {};						// init

					// grab/build body validation format
					if (obj.paths[route][method].requestBody) {
						const ref = obj.paths[route][method].requestBody.content['application/json'].schema.$ref;
						if (ref) {											// if using reference schema syntax, dereference first
							temp.paths[lc_route][lc_method].body = resolve_ref(ref, obj);
						} else {
							temp.paths[lc_route][lc_method].body = obj.paths[route][method].requestBody.content['application/json'].schema;
						}
						flatten_obj(temp.paths[lc_route][lc_method].body, obj, 0);
					}

					// grab/build query validation format
					if (obj.paths[route][method].parameters) {
						const param_obj = obj.paths[route][method].parameters;
						for (let i in param_obj) {
							if (param_obj[i].$ref) {						// if using reference param syntax, dereference first
								param_obj[i] = resolve_ref(param_obj[i].$ref, obj);
							}

							const name = param_obj[i].name;
							if (name && param_obj[i].in === 'query') {
								if (!temp.paths[lc_route][lc_method].query) {			// init
									temp.paths[lc_route][lc_method].query = {			// build the same object structure found in the openapi body spec
										type: 'object',
										required: [],						// populated later
										properties: {}						// populated later
									};
								}
								if (param_obj[i].schema.$ref) {				// if using reference schema syntax, dereference first
									temp.paths[lc_route][lc_method].query.properties[name] = resolve_ref(param_obj[i].schema.$ref, obj);
								} else {
									temp.paths[lc_route][lc_method].query.properties[name] = param_obj[i].schema;
								}
								if (param_obj[i].required === true) {
									temp.paths[lc_route][lc_method].query.required.push(name);
								}
								flatten_obj(temp.paths[lc_route][lc_method].query, obj, 0);
							}
						}
					}
				}
			}
		}
		return temp;
	}

	// flatten a swagger object - "obj" is the full swagger yaml as a json object
	function flatten_obj(thing, obj, depth) {
		if (depth >= 256) {
			logger.error('[validate] parsing swagger has gone too deep... giving up');
			return null;
		}

		if (thing.type === 'object') {
			for (let prop in thing.properties) {
				if (thing.properties[prop].$ref) {
					thing.properties[prop] = resolve_ref(thing.properties[prop].$ref, obj);
				}
				flatten_obj(thing.properties[prop], obj, ++depth);

				// log a highly visible warning on fields that are mix-case && do not have the case flag but *probably* should
				if (prop.toLowerCase() !== prop && !thing.properties[prop]['x-validate_case_insensitive']) {
					logger.warn('---');
					logger.warn('[OpenAPI/Swagger File] the field "' + prop + '" is missing the case insensitive flag.'); // if you see this, edit swagger file
					logger.warn('---');
				}
			}
		} else if (thing.type === 'array') {
			if (thing.items.$ref) {
				const item = resolve_ref(thing.items.$ref, obj);
				flatten_obj(item, obj, ++depth);
				thing.items = item;
			}
			if (thing.items.type === 'object') {
				flatten_obj(thing.items, obj, ++depth);
			}
		}
	}

	// resolve a swagger reference
	function resolve_ref(ref, obj) {
		if (ref[0] === '#') {
			ref = ref.substring(2);
		}
		const parts = ref.split('/');					// path to the ref is here, as an array

		let prev = JSON.parse(JSON.stringify(obj));
		let key = null;
		for (let i in parts) {							// walk the path to this ref
			key = parts[i];
			if (prev[key]) {
				prev = prev[key];						// keep changing "prev" to let us walk the path
			}
		}

		if (prev.type || prev.name) {					// we found where the ref ends (parameters have "name" at this level, not "type")
			return prev;
		} else {
			return null;								// we did not find it
		}
	}

	//-------------------------------------------------------------
	// style of our errors
	//-------------------------------------------------------------
	validate.fmt_input_error = (req, errs) => {
		let error_msgs = [];
		for (let i in errs) {
			const msg = build_error_msg(req, errs[i].key, errs[i].symbols);	// make the english error message, message source is in swagger file
			error_msgs.push(msg);
		}

		if (!t.ot_misc.detect_ak_route(req)) {					// if request is from apollo return errors as is, they will translate
			return { statusCode: 400, msgs: error_msgs, raw: errs };
		} else {
			return { statusCode: 400, msgs: error_msgs };
		}
	};

	//-------------------------------------------------------------
	// validate this request - async style (LOOKS FOR "req._validate_path" to find the right schema)
	//-------------------------------------------------------------
	validate.request = (req, res, additional_validation, next) => {
		const errors = t.validate.request_inline(req, additional_validation);
		if (errors) {
			// error already logged
			return res.status(400).json(errors);
		} else {
			return next();
		}
	};

	//-------------------------------------------------------------
	// validate this request - inline style - (LOOKS FOR "req._validate_path" to find the right schema)
	//-------------------------------------------------------------
	validate.request_inline = (req, additional_validation) => {
		let errors = [];
		let was_looked_at = false;

		if (req) {
			const lc_req_url = req._validate_path ? req._validate_path.toLowerCase() : null;
			const lc_req_method = req.method ? req.method.toLowerCase() : null;
			const flat_openapi = validate.pick_openapi_file(req);
			if (flat_openapi.paths[lc_req_url] && flat_openapi.paths[lc_req_url][lc_req_method]) {
				if (flat_openapi.paths[lc_req_url][lc_req_method].body) {
					logger.debug('[validate] found matching openapi route for body validation: ' + lc_req_url + ', method: ' + lc_req_method);
					const body_errors = validate_input_field([], req.body, flat_openapi.paths[lc_req_url][lc_req_method].body, req, 0);
					errors = errors.concat(body_errors);
					was_looked_at = true;
				}
			}

			if (flat_openapi.paths[lc_req_url] && flat_openapi.paths[lc_req_url][lc_req_method]) {
				if (flat_openapi.paths[lc_req_url][lc_req_method].query) {
					logger.debug('[validate] found matching openapi route for query validation: ' + lc_req_url + ', method: ' + lc_req_method);
					const query_errors = validate_input_field([], req.query, flat_openapi.paths[lc_req_url][lc_req_method].query, req, 0);
					errors = errors.concat(query_errors);
					was_looked_at = true;
				}
			}
		}

		if (typeof additional_validation === 'function') {
			errors = errors.concat(additional_validation(req));
			was_looked_at = true;
		}

		if (was_looked_at === false) {
			logger.debug('[validate] request does not need to be validated', req.method, req._validate_path);
			return null;
		} else {
			if (errors.length > 0) {
				const ret = validate.fmt_input_error(req, errors);
				logger.warn('[validate] input validation - errors:', ret);

				if (req.body && req.body._ignore_validation_errors === true) {	// incase there are dire circumstances, allow someone to ignore validation
					logger.warn('[validate] validation errors are being ignored b/c "_ignore_validation_errors" is set');
					return null;
				} else {
					return ret;
				}

			} else {
				logger.debug('[validate] input validation - success');
				return null;
			}
		}
	};

	// validate THIS input field and recursively check on nested fields
	function validate_input_field(path2field, input, body_spec, req, depth) {
		let errors = [];
		if (depth >= 256) {
			logger.error('[validate] parsing input for validation has gone too deep... giving up');
			return null;
		}
		const req_body = req.body;
		const lc_req_method = req.method ? req.method.toLowerCase() : null;

		// check against required fields
		if (body_spec.required) {
			for (let i in body_spec.required) {							// check for required fields
				const spec_prop = body_spec.required[i];

				// --- handle if case-insensitivity is enabled for key --- //
				let input2check = input;								// init, normally use the input object in the request as is
				let key2check = spec_prop;								// init, normally use the case from the swagger spec
				if (body_spec.properties[spec_prop] && body_spec.properties[spec_prop]['x-validate_case_insensitive'] === true) {
					input2check = t.misc.lc_object_keys(input, false);	// switch to object with lowercase keys
					key2check = spec_prop.toLowerCase();				// switch to lower case key
				}

				if (!input2check || input2check[key2check] === undefined) {
					const _path2field = JSON.parse(JSON.stringify(path2field));
					_path2field.push(spec_prop);
					const symbols = {
						'$PROPERTY_NAME': _path2field.join('.'),
					};
					errors.push({ key: 'missing_required', symbols: symbols });
				}
			}
		}

		// check for correct datatype
		const lc_input_type = input === null ? 'object' : input.constructor.name.toLowerCase();	// null does not have the constructor method
		if (body_spec.type !== lc_input_type) {								// incorrect type
			if (body_spec.type === 'number' && !isNaN(input)) {
				// input is a string number, like "5" instead of 5, but that is fine
			} else {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
					'$PROPERTY_TYPE': body_spec.type,
					'$TYPE': lc_input_type
				};
				errors.push({ key: 'invalid_type', symbols: symbols });
			}
		}

		// ----- [iter on object keys] ----- //
		if (body_spec.type === 'object' && lc_input_type === 'object') {
			for (let spec_prop in body_spec.properties) {					// check for correct type
				const _path2field = JSON.parse(JSON.stringify(path2field));
				_path2field.push(spec_prop);

				// recursively look at nested object fields
				if (input !== null) {										// give up if input dne

					// --- handle if case-insensitivity is enabled for key --- //
					let input2check = input;								// init, normally use the input object in the request as is
					let key2check = spec_prop;								// init, normally use the case from the swagger spec
					if (body_spec.properties[spec_prop] && body_spec.properties[spec_prop]['x-validate_case_insensitive'] === true) {
						input2check = t.misc.lc_object_keys(input, false);	// switch to object with lowercase keys
						key2check = spec_prop.toLowerCase();				// switch to lower case key

						// fabric work
						switchKey(spec_prop, key2check);
					}

					if (!input2check || input2check[key2check] !== undefined) {	// give up if input dne, prevents making 1k errors on 1 missing root field
						errors = errors.concat(validate_input_field(_path2field, input2check[key2check], body_spec.properties[spec_prop], req, ++depth));
					}
				}
			}
		}

		// ----- [iter on array entries] ----- //
		if (body_spec.type === 'array' && Array.isArray(input)) {
			for (let i in input) {										// check each entry in array
				const _path2field = JSON.parse(JSON.stringify(path2field));
				_path2field[_path2field.length - 1] += '[' + i + ']';	// append the array syntax "[i]" to the prev entry

				// recursively look at each entry in the input array
				errors = errors.concat(validate_input_field(_path2field, input[i], body_spec.items, req, ++depth));
			}
		}

		// check number restrictions
		if (body_spec.type === 'number') {
			if (body_spec['minimum'] !== undefined) {
				if (Number(input) < body_spec['minimum']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MIN': body_spec['minimum'],
					};
					errors.push({ key: 'too_small', symbols: symbols });
				}
			}
			if (body_spec['maximum'] !== undefined) {
				if (Number(input) > body_spec['maximum']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MAX': body_spec['maximum'],
					};
					errors.push({ key: 'too_large', symbols: symbols });
				}
			}

			// I had to make section instead of reusing 'maximum' / 'minimum' b/c IBM Cloud swagger-cli validator is old and won't accept max/min  on strings
			// dsh todo - remove this section and fields if IBM Cloud Docs updates their swagger-cli
			if (body_spec['x-minimum'] !== undefined) {
				if (Number(input) < body_spec['x-minimum']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MIN': body_spec['x-minimum'],
					};
					errors.push({ key: 'too_small', symbols: symbols });
				}
			}
			if (body_spec['x-maximum'] !== undefined) {
				if (Number(input) > body_spec['x-maximum']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MAX': body_spec['x-maximum'],
					};
					errors.push({ key: 'too_large', symbols: symbols });
				}
			}
		}

		// check for enum, must match one of the possible values
		if (body_spec['enum'] && Array.isArray(body_spec['enum'])) {
			if (!body_spec['enum'].includes(input)) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
					'$VALUES': build_choices(body_spec['enum']),		// build a string where each value is surrounded by single quotes
				};
				errors.push({ key: 'invalid_value', symbols: symbols });
			}
		}

		// check regex restrictions
		if (body_spec.type === 'string') {
			let regex_error = false;
			if (body_spec['x-validate_regex_must_pass']) {
				const name = body_spec['x-validate_regex_must_pass'];
				if (ev.REGEX[name]) {
					const regex = new RegExp(ev.REGEX[name].source, ev.REGEX[name].flags);
					if (!regex.test(input)) {
						regex_error = true;
					}
				}
			}
			if (body_spec['x-validate_regex_must_fail']) {
				const name = body_spec['x-validate_regex_must_fail'];
				if (ev.REGEX[name]) {
					const regex = new RegExp(ev.REGEX[name].source, ev.REGEX[name].flags);
					if (regex.test(input)) {
						regex_error = true;
					}
				}
			}
			if (regex_error) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				if (body_spec['x-validate_regex_error_msg']) {
					errors.push({ key: body_spec['x-validate_regex_error_msg'], symbols: symbols });
				} else {
					errors.push({ key: 'regex_generic_error', symbols: symbols });
				}
			}
		}

		// check if editing restricted fields or if input has extra keys
		const problem_keys = illegal_or_extra_keys();
		for (let full_name in problem_keys) {
			const symbols = {
				'$PROPERTY_NAME': full_name,
			};
			errors.push({ key: problem_keys[full_name].msg_key, symbols: symbols });
		}

		// check string length restrictions
		if (body_spec.type === 'string') {
			if (body_spec['minLength'] !== undefined) {
				if (input.length < body_spec['minLength']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MIN': body_spec['minLength'],
					};
					errors.push({ key: 'str_too_small', symbols: symbols });
				}
			}
			if (body_spec['maxLength'] !== undefined) {
				if (input && input.length > body_spec['maxLength']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MAX': body_spec['maxLength'],
					};
					errors.push({ key: 'str_too_large', symbols: symbols });
				}
			}
		}

		// check if using illegal values
		if (body_spec.type === 'string') {
			for (let i in body_spec['x-validate_illegal_values']) {
				const illegal_value = body_spec['x-validate_illegal_values'][i];
				if (input === illegal_value) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$VALUES': build_choices(body_spec['x-validate_illegal_values']),		// build str, each value has single quotes
					};
					errors.push({ key: 'illegal_value', symbols: symbols });
				}
			}
		}

		// check for for base 64 encoded PEM
		if (body_spec.type === 'string' && body_spec['x-validate_base64_certificate'] === true) {
			let parsed = t.ot_misc.parseCertificate(input);
			if (!parsed) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				errors.push({ key: 'invalid_certificate', symbols: symbols });
			}
		}

		// check for valid cpu values
		if (body_spec.type === 'string' && body_spec['x-validate_cpu'] === true) {
			let error = t.misc.invalid_cpu_value(input, body_spec['x-maximum'], body_spec['x-minimum']);
			if (error) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				errors.push({ key: 'invalid_cpu_units', symbols: symbols });
			}
		}

		// check for valid memory values
		if (body_spec.type === 'string' && body_spec['x-validate_memory'] === true) {
			let error = t.misc.invalid_bytes_value(input, body_spec['x-maximum'], body_spec['x-minimum']);
			if (error) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				errors.push({ key: 'invalid_memory_units', symbols: symbols });
			}
		}

		// check for valid storage values
		if (body_spec.type === 'string' && body_spec['x-validate_storage'] === true) {
			let error = t.misc.invalid_bytes_value(input, body_spec['x-maximum'], body_spec['x-minimum']);
			if (error) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				errors.push({ key: 'invalid_storage_units', symbols: symbols });
			}
		}

		// check for valid duration/time string values
		if (body_spec.type === 'string' && body_spec['x-validate_duration'] === true) {
			let error = t.misc.invalid_duration_value(input, body_spec['maximum'], body_spec['minimum']);
			if (error) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				errors.push({ key: 'invalid_duration_units', symbols: symbols });
			}
		}

		// check for valid array lengths
		if (body_spec.type === 'array' && Array.isArray(input)) {
			if (body_spec['minLength'] !== undefined) {
				if (input.length < body_spec['minLength']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MIN': body_spec['minLength'],
					};
					errors.push({ key: 'arr_too_small', symbols: symbols });
				}
			}
			if (body_spec['maxLength'] !== undefined) {
				if (input.length > body_spec['maxLength']) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MAX': body_spec['maxLength'],
					};
					errors.push({ key: 'arr_too_large', symbols: symbols });
				}
			}
		}

		// check if input array length matches a master field array length (like the raft orderer's crypto.length === zone.length)
		if (body_spec.type === 'array') {
			if (body_spec['x-validate_matching_lengths']) {
				const masterFieldPath = body_spec['x-validate_matching_lengths'];
				const masterField = t.misc.safe_dot_nav(req_body, 'req_body.' + masterFieldPath);
				const input_length = Array.isArray(input) ? input.length : 0;
				if (masterField && masterField.length !== input_length) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$MASTER_PROPERTY': masterFieldPath,
						'$LEN': masterField.length,
					};
					errors.push({ key: 'unmatched_lengths', symbols: symbols });
				}
			}
		}

		// check for invalid field combinations (catches if multiple fields are invalid in relation to each other)
		if (body_spec['x-validate_key_combination']) {
			for (let path2ComboField in body_spec['x-validate_key_combination']) {
				const checkingField = body_spec['x-validate_key_combination'][path2ComboField];
				const comboFieldValue = t.misc.safe_dot_nav(req_body, 'req_body.' + path2ComboField);	// grab the other field's value we are checking
				if (comboFieldValue === null) {
					if (checkingField && checkingField.key_should_exist === true) {						// if its not here but it should be, error
						const symbols = {
							'$PROPERTY_NAME': path2field.join('.'),
							'$COMPANION_PROPERTY': path2ComboField,
						};
						errors.push({ key: 'invalid_combo_missing', symbols: symbols });
					}
				} else {
					if (checkingField && checkingField.key_should_not_exist === true) {					// if its here and it shouldn't be, error
						const symbols = {
							'$PROPERTY_NAME': path2field.join('.'),
							'$CONFLICT_PROPERTY': path2ComboField,
						};
						errors.push({ key: 'invalid_combo_not_exist', symbols: symbols });
					}
				}
			}
		}

		// check for use of a paid feature on a free k8s plan
		if (body_spec['x-validate_paid_plan_feature'] === true) {										// its a problem if its a saas instance & its not paid
			if (input !== undefined && ev.INFRASTRUCTURE === ev.STR.INFRA_IBP_SAAS) {
				if (ev.CLUSTER_DATA && ev.CLUSTER_DATA.type !== ev.STR.PAID_K8S) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
					};
					errors.push({ key: 'invalid_key_on_free_plan', symbols: symbols });
				}
			}
		}

		// check for incorrect use of "deployment_attrs"
		if (body_spec['x-validate_invalid_params_for_import'] === true) {
			if (t.component_lib.include_deployment_data(req)) {					// its a problem if the component is imported && deployment data is asked for
				if (req._component_doc && req._component_doc.location !== ev.STR.LOCATION_IBP_SAAS) {
					const symbols = {
						'$PROPERTY_NAME': path2field.join('.'),
						'$VALUE': 'included',
					};
					errors.push({ key: 'invalid_query_param_import', symbols: symbols });
				}
			}
		}

		// check if component is imported and trying to change k8s stuff (invalid api)
		if (body_spec['x-validate_comp_not_imported'] === true) {
			if (req._component_doc && req._component_doc.location !== ev.STR.LOCATION_IBP_SAAS) {
				const symbols = {};
				errors.push({ key: 'invalid_on_imported_comps', symbols: symbols });
			}
		}

		// check if sending more than 1 root field in object
		if ((body_spec['x-validate_only_one_key'] === 'ak' && t.ot_misc.detect_ak_route(req)) || body_spec['x-validate_only_one_key'] === 'all') {
			let count = Object.keys(input).length;
			if (typeof input.ignore_warnings === 'boolean') { count--; }
			if (typeof input === 'object' && count > 1) {
				const symbols = {};
				errors.push({ key: 'too_many_keys', symbols: symbols });
			}
		}

		// check if the hostname is in our whitelist or not
		if (input && body_spec['x-validate_known_hostname'] === true) {
			let url_str = input;
			const regex = new RegExp(/:\d{1,5}$/, 'i');
			if (!regex.test(input)) {														// if no port in input find "port" field in body
				const path2parent = path2field.slice(0, path2field.length - 1).join('.');			// get path to the parent object
				const port = t.misc.safe_dot_nav(req_body, 'req_body.' + path2parent + '.port');	// get the value of "port" in req body
				url_str = input + ':' + port;
			}
			if (!t.ot_misc.validateUrl(url_str, req._whitelist || ev.URL_SAFE_LIST)) {
				const symbols = {
					'$PROPERTY_NAME': path2field.join('.'),
				};
				errors.push({ key: 'unknown_enroll_host', symbols: symbols });
			}
		}

		// check for incompatible fabric "version" upgrades
		if (body_spec['x-validate_breaking_version_upgrade'] && typeof body_spec['x-validate_breaking_version_upgrade'] === 'object') {
			if (req && req.body && req.body.ignore_warnings === true) {
				logger.warn('[validate] skipping breaking version upgrade checks b/c "ignore_warnings" is true');
			} else {
				if (req._component_doc && req._component_doc.version) {
					for (let from_version in body_spec['x-validate_breaking_version_upgrade']) {	// iter on each outer rule
						const invalid_versions = body_spec['x-validate_breaking_version_upgrade'][from_version];
						for (let z in invalid_versions) {											// iter on each sub rule
							const invalid_upgrade_version = invalid_versions[z];
							const comps_version_atm = req._component_doc.version;
							const desired_version = input;

							// first check if the version in use matches an incompatible upgrade rule
							if (t.misc.version_matches_pattern(from_version, comps_version_atm)) {

								// next check if the desired version matches the incompatible upgrade rule
								if (t.misc.version_matches_pattern(invalid_upgrade_version, desired_version)) {
									const symbols = {
										'$PROPERTY_NAME': path2field.join('.'),
										'$VALUE': from_version,
										'$VALUE2': invalid_upgrade_version,
									};
									errors.push({ key: 'invalid_fabric_upgrade', symbols: symbols });
								}
							}
						}
					}
				}
			}
		}

		return errors;

		// only complain about each key once - its either an illegal or an extra key, not both. returns all key errors in the object.
		function illegal_or_extra_keys() {
			const err = {};
			if (body_spec.type === 'object' && body_spec['x-validate_illegal_keys']) {
				for (let i in body_spec['x-validate_illegal_keys']) {
					const prop = body_spec['x-validate_illegal_keys'][i];
					const _path2field = JSON.parse(JSON.stringify(path2field));
					_path2field.push(prop);

					if (input[prop] !== undefined) {
						const full_name = _path2field.join('.');
						if (lc_req_method === 'put') {				// user cannot edit this key
							if (!err[full_name]) {					// if error for key doesn't exist yet, add the error
								err[full_name] = { msg_key: 'illegal_key_edit' };
							}
						} else {									// user cannot set this key
							if (!err[full_name]) {					// if error for key doesn't exist yet, add the error
								err[full_name] = { msg_key: 'illegal_key' };
							}
						}
					}
				}
			}

			// check if input object contains extra keys
			if (body_spec.type === 'object' && body_spec['x-validate_no_extra_keys'] === true) {
				const ok_fields = ['type'];							// extra keys that are okay, but I don't want them listed in swagger
				if (body_spec.properties) {
					const valid_keys = Object.keys(body_spec.properties);
					if (typeof input === 'object') {
						for (let input_key in input) {
							if (!ok_fields.includes(input_key) && !valid_keys.includes(input_key)) {	// extra fields that are allowed

								const lc_body_spec_props = t.misc.lc_object_keys(body_spec.properties, false);
								const lc_key = input_key.toLowerCase();

								if (lc_body_spec_props[lc_key] && lc_body_spec_props[lc_key]['x-validate_case_insensitive'] === true) {
									// all good, key is not unexpected, its just a different case than in the swagger spec object
								} else {
									const _path2field = JSON.parse(JSON.stringify(path2field));
									_path2field.push(input_key);

									const full_name = _path2field.join('.');
									if (!err[full_name]) {			// if error for key doesn't exist yet, add the error
										err[full_name] = { msg_key: 'no_extra_keys' };
									}
								}
							}
						}
					}
				}
			}

			return err;
		}

		// switch key in request with a key that is compatible with Fabric's code (this is not a validation check - this overwrites the body!)
		function switchKey(spec_key, lc_key) {
			if (body_spec.properties[spec_key]['x-validate_overwrite_key']) {
				const overwrite_key = body_spec.properties[spec_key]['x-validate_overwrite_key'];
				const key_in_req = findKeyCaseInReq(input, lc_key);
				if (key_in_req && key_in_req !== overwrite_key) {							// don't do anything if key wasn't found, or is already the same
					input[overwrite_key] = input[key_in_req];								// do not deep copy it, that would break more switches down the line
					delete input[key_in_req];												// delete original, switch is done
				}
			}
		}

		// find the exact key name used in the request body
		function findKeyCaseInReq(req_obj, lc_key) {
			for (let keyInReq in req_obj) {
				if (keyInReq.toLowerCase() === lc_key) {
					return keyInReq;
				}
			}
			return null;
		}
	}

	/* Build an error string for the input failure
	- symbols in the swagger error messages will be replaced.
	- swagger error messages are defined in the swagger yaml, field: "x-validate_error_messages"

	symbols: {
		$PROPERTY_NAME: "",
		$PROPERTY_TYPE: "",
		$TYPE: "",
		$VALUES: "",
		$MAX: "",
		$MIN: "",
		$TYPE: "",
	}*/
	function build_error_msg(req, name, symbols) {
		const flat_openapi = validate.pick_openapi_file(req);
		let base_e_msg = name ? flat_openapi.validate_error_messages[name] : null;
		if (!base_e_msg) {
			logger.error('[validate] unable to find validate_error_message for msg w/name: ' + name);
			return 'An internal error has occurred during input validation.';
		} else {
			for (let sym in symbols) {
				base_e_msg = base_e_msg.replace(sym, symbols[sym]);
			}
		}
		return base_e_msg;
	}

	// custom validation for the "resources" field
	validate.resource_validation = (req) => {
		const fields = ['cpu', 'memory'];											// the fields that have to be checked
		const errors = [];

		// make sure requests is less <= limits
		if (req && req.body && req.body.resources) {
			const body = req.body;
			for (let sub_component in body.resources) {
				for (let i in fields) {
					const resource_field = fields[i];
					let requests = t.misc.safe_dot_nav(body, 'body.resources.' + sub_component + '.requests.' + resource_field);
					let limits = t.misc.safe_dot_nav(body, 'body.resources.' + sub_component + '.limits.' + resource_field);

					if (limits === null || requests === null) {	// no limits is fine, skip validation
						continue;
					}

					if (resource_field === 'cpu') {									// convert to like units
						requests = t.misc.normalize_cpu(requests);
						limits = t.misc.normalize_cpu(limits);
					} else if (resource_field === 'memory') { 						// convert to like units
						requests = t.misc.normalize_bytes(requests);
						limits = t.misc.normalize_bytes(limits);
					}

					if (requests > limits) {
						if (resource_field === 'memory') {							// make friendly units
							requests = t.misc.friendly_bytes(requests, 1);
							limits = t.misc.friendly_bytes(limits, 1);
						}
						const symbols = {
							'$PROPERTY_NAME': 'resources.' + sub_component + '.requests.' + resource_field,
							'$REQUESTS': requests,
							'$LIMITS': limits,
						};
						errors.push({ key: 'invalid_requests_for_limits', symbols: symbols });
					}
				}
			}
		}
		return errors;
	};

	// custom validation for the "recreate orderer api - config/crypto must be array of 1
	validate.valid_precreate_config = (req) => {
		const errors = [];

		// check if pre-create "config" array is of size 1 (exactly)
		if (t.ot_misc.get_api_version(req) === 'v2') {
			if (req && req.path.includes(ev.STR.ORDERER) && req.body && Array.isArray(req.body.config)) {
				if (req.body.cluster_id && req.body.config.length > 1) {
					const symbols = {
						'$PROPERTY_NAME': 'config',
						'$MAX': 1,
					};
					errors.push({ key: 'arr_too_large', symbols: symbols });
				}
				if (req.body.cluster_id && req.body.config.length < 1) {
					const symbols = {
						'$PROPERTY_NAME': 'config',
						'$MIN': 1,
					};
					errors.push({ key: 'arr_too_small', symbols: symbols });
				}
			}
		}

		// check if pre-create "crypto" array is of size 1 (exactly)
		else {
			if (req && req.path.includes(ev.STR.ORDERER) && req.body && Array.isArray(req.body.crypto)) {
				if (req.body.cluster_id && req.body.crypto.length > 1) {
					const symbols = {
						'$PROPERTY_NAME': 'crypto',
						'$MAX': 1,
					};
					errors.push({ key: 'arr_too_large', symbols: symbols });
				}
				if (req.body.cluster_id && req.body.crypto.length < 1) {
					const symbols = {
						'$PROPERTY_NAME': 'crypto',
						'$MIN': 1,
					};
					errors.push({ key: 'arr_too_small', symbols: symbols });
				}
			}
		}

		return errors;
	};

	// validate the resources and the precreate config
	validate.valid_create_component = (req) => {
		let errors = validate.resource_validation(req);
		errors = errors.concat(validate.valid_precreate_config(req));
		return errors;
	};

	// validate the cluster id - this method needs the list of existing ids
	validate.valid_cluster_id = (req, existingClusterIds, is_appending) => {
		const errors = [];
		if (req && req.body && req.path.includes(ev.STR.ORDERER)) {
			if (is_appending) {
				const ext_append = req.body.external_append || req.body.append;

				if (!req.body.cluster_id) {										// cluster id is required for normal or external append
					const symbols = {
						'$PROPERTY_NAME': 'cluster_id',
					};
					errors.push({ key: 'missing_required', symbols: symbols });
				}

				if (!ext_append && req.body.cluster_id) {						// for normal append the cluster id must already exist
					if (Array.isArray(existingClusterIds) && !existingClusterIds.includes(req.body.cluster_id)) {
						const symbols = {
							'$PROPERTY_NAME': 'cluster_id',
							'$VALUES': build_choices(existingClusterIds),		// build a string where each value is surrounded by single quotes
						};
						errors.push({ key: 'invalid_value', symbols: symbols });
					}
				}
			}
		}
		return errors;
	};

	// build enum choices for an error msg
	function build_choices(arrChoices) {
		if (Array.isArray(arrChoices) && arrChoices.length > 0) {
			return '\'' + arrChoices.join('\', \'') + '\'';		// build a string where each value is surrounded by single quotes
		} else {
			return 'valid_choices_unknown';
		}
	}

	// custom validation for the query param that should be an array of strings
	validate.query_filter_orderers = (req) => {
		const errors = [];
		if (req && req.query && req.query.filter_orderers) {
			const filter_by_orderer_hosts = t.signature_collection_lib.build_orderer_hostnames(req);
			if (Array.isArray(filter_by_orderer_hosts) && filter_by_orderer_hosts.length === 0) {
				const symbols = {
					'$PROPERTY_NAME': 'filter_orderers',
				};
				errors.push({ key: 'invalid_query_param_arr_str', symbols: symbols });
			}
		}
		return errors;
	};

	// custom validation for the query param that won't work on certain routes
	// dsh todo see if you can move this into swagger validator and remove this
	validate.ca_attrs_unsupported = (req) => {
		const errors = [];
		const invalid_paths = [
			'/ak/api/v2/components/tags/{tag}', '/ak/api/v2/components/types/{type}',
			'/ak/api/v3/components/tags/{tag}', '/ak/api/v3/components/types/{type}'
		];
		if (req && req.query && req.query.ca_attrs && invalid_paths.includes(req._validate_path)) {
			const symbols = {
				'$PROPERTY_NAME': 'ca_attrs',
			};
			errors.push({ key: 'unsupported_query', symbols: symbols });
		}
		return errors;
	};

	// pick a validation file
	validate.pick_openapi_file = (req) => {
		const version = t.ot_misc.get_api_version({ path: req._validate_path });	// use the validate path b/c of how tests are written
		if (version === 'v2') {
			return flat_swag.v2;
		} else if (version === 'v3') {
			return flat_swag.v3;
		} else {
			return flat_swag.v3;						// default
		}
	};

	// pick a validator - (note that v1 does not have a validator)
	validate.pick_ver = (req) => {
		const version = t.ot_misc.get_api_version(req);	// use the real path to build the validate path
		if (version === 'v2') {
			return 'v2';
		} else if (version === 'v3') {
			return 'v3';
		} else {
			return 'v3';								// default
		}
	};

	// --------------------------------------------
	// start
	// --------------------------------------------
	if (opts.file_names) {
		validate.load_swagger_paths(opts.file_names);
	} else if (opts.files) {
		validate.load_swaggers(opts.files);
	}
	for (let ver in flat_swag) {
		logger.info('[validate] loaded OpenAPI/Swagger file. Version:', flat_swag[ver] ? flat_swag[ver].version : '-');
		//t.fs.writeFileSync('./test_swagger_flat_' + ver + '.json', JSON.stringify(flat_swag[ver], null, '\t')); // debug
	}

	return validate;
};
