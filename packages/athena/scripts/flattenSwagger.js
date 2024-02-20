const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const defaultJson = require('../json_docs/default_settings_doc.json');

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
		console.error('[validate] parsing swagger has gone too deep... giving up');
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
				console.warn('---');
				console.warn('[OpenAPI/Swagger File] the field "' + prop + '" is missing the case insensitive flag.'); // if you see this, edit swagger file
				console.warn('---');
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

(async () => {
	const flat_swag = {
		v2: {
			validate_error_messages: {},				// field is set later, will hold error message formats
			paths: {},									// field is set later, all paths get set here, all $refs all flattened, thus no need to lookup $refs
		},
		v3: {
			validate_error_messages: {},				// field is set later, will hold error message formats
			paths: {},									// field is set later, all paths get set here, all $refs all flattened, thus no need to lookup $refs
		}
	};

	const designDocs = defaultJson.db_defaults.DB_SYSTEM.design_docs;
	for (const doc of designDocs) {
		if (doc && doc.indexOf('.yaml') >= 0) {
			const swaggerContent = yaml.load(fs.readFileSync(path.join(__dirname, doc), 'utf8'));
			const version = 'v' + swaggerContent.info.version.substring(0, 1);					// this line only works up to v9, but thats fine
			flat_swag[version] = flatten_swagger_json(swaggerContent);
		}
	}

	await fs.writeFileSync(path.join(__dirname, '../json_docs/json_validation/swagger_flatten_validation.json'), JSON.stringify(flat_swag), 'utf8');
	console.log('Flatten JSON created successfully!');

})();
