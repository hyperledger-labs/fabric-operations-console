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
//------------------------------------------------------------------
// create_databases.js - Runs on startup to create athena databases
//------------------------------------------------------------------

module.exports = (logger, t) => {
	const setup = {};
	const couch_lib = t.couch_lib;

	setup.createDatabasesAndDesignDocs = (cb) => {
		const config_map = require('../json_docs/default_settings_doc.json').db_defaults;	// init with the defaults
		const db_custom_names = require('../json_docs/default_settings_doc.json').db_custom_names;

		const errs = [];

		// check if config file db names are replacing names in the default file
		for (let db in config_map) {									// copy config file setting -> default doc
			let name2use = '';

			// first look for custom names in default settings file
			if (db_custom_names && db_custom_names[db] && typeof db_custom_names[db] === 'string') {
				name2use = db_custom_names[db];
			}

			// then look for custom names in the config file
			if (t.config_file && t.config_file.db_custom_names && t.config_file.db_custom_names[db] && typeof t.config_file.db_custom_names[db] === 'string') {
				name2use = t.config_file.db_custom_names[db];
			}

			// then env
			if (process.env[db]) {
				name2use = process.env[db];							// an env setting should override config
			}

			if (name2use) {
				logger.debug('[db startup] custom db name:', db, '=', name2use);
				config_map[db].name = name2use;
				process.env[db] = name2use;							// stuff it into env too
			}
		}

		// ----- check/create each database ---------
		t.async.eachLimit(config_map, 8, (db_part, cb_createDB) => {

			logger.debug('[db startup] checking if database exists:', db_part.name);
			const opts = { db_name: db_part.name };
			couch_lib.getDatabase(opts, (err) => {
				if (err) {
					logger.debug('[db startup] need to create database', db_part.name);
					couch_lib.createDatabase(opts, (err) => {
						if (err && err.statusCode !== 412) {
							logger.error('[db startup] error creating database', db_part.name, err);
							errs.push(err);
							return cb_createDB();
						} else {
							return cb_createDB();
						}
					});
				} else {
					return cb_createDB();
				}
			});
		}, () => {

			// -------- check/create each document -----------
			t.async.eachOfLimit(config_map, 8, (db_part, db, cb_docs_created) => {
				if (!db_part.design_docs || db_part.design_docs.length === 0) {			// no docs to make
					return cb_docs_created();
				} else {
					const docs_to_create = db_part.design_docs;
					setup.checkDocs(errs, db_part.name, docs_to_create, () => {			// check the doc
						return cb_docs_created();
					});
				}
			}, () => {

				// -------- Finished -----------
				logger.debug('[db startup] finished checking docs for all dbs\n');
				if (errs && errs.length > 0) {
					logger.error('[db startup] errors during setup :(', errs.length);
				} else {
					logger.info('[db startup] no errors during setup :)');
				}
				return cb(errs);
			});
		});
	};

	// check if docs exist for db
	setup.checkDocs = (errs, db_name, docs_to_create, cb) => {
		t.async.eachLimit(docs_to_create, 8, (doc, cb_createDocs) => {
			let fs_doc = '';
			if (doc && doc.indexOf('.json') >= 0) {
				try {
					fs_doc = require(doc);
				} catch (e) {
					logger.error('[db startup] unable to read json file. cannot add to database.', doc, e);
					return cb_createDocs();
				}
			} else {
				try {
					const temp = t.fs.readFileSync(t.path.join(__dirname, doc), 'utf8');
					fs_doc = t.yaml.load(temp);
				} catch (e) {
					logger.error('[db startup] unable to read yaml file. cannot add to database.', doc, e);
					return cb_createDocs();
				}
			}

			if (!fs_doc || typeof fs_doc !== 'object') {
				logger.error('[db startup] doc "' + doc + '" is empty or malformed. was unable parse as object.');
				return cb_createDocs();
			}

			if (doc.indexOf('ibp_openapi_') >= 0) {				// build a couch doc id from the swagger file
				fs_doc._id = t.ot_misc.build_swagger_id(fs_doc);
				fs_doc.type = 'json_validation';
			}

			// opts for both the read and the write
			const read_wr_opts = {
				db_name: db_name,
				doc: fs_doc,
				_id: fs_doc._id
			};
			couch_lib.getDoc(read_wr_opts, (err_getDoc, resp_getDoc) => {
				// --- Does not exist ---- //
				if (err_getDoc && err_getDoc.statusCode === 404) {
					if (fs_doc && fs_doc._id === '00_settings_athena') {		// this doc is a little different
						logger.debug('[db startup] copying config settings to create settings file:', process.env.CONFIGURE_FILE);
						setup.detect_obj_changes(t.config_file, null, fs_doc);	// edits fs_doc
						if (fs_doc.initial_admin) {								// create the initial admin user for software
							const lc_admin = fs_doc.initial_admin.toLowerCase();
							fs_doc.access_list[lc_admin] = {
								roles: ['manager', 'writer', 'reader'],
								created: Date.now(),
								uuid: t.uuidv4(),
							};
							fs_doc.admin_contact_email = lc_admin;
						}
					}
					logger.debug('[db startup] creating doc', fs_doc._id, 'in database', db_name);
					writeDoc(read_wr_opts, t.misc.sortKeys(fs_doc), (w_err) => {
						if (w_err) {
							errs.push(w_err);
						}
						return cb_createDocs(); 								// any errors logged in writeDoc function
					});
				} else if (err_getDoc) {
					logger.error(`[db startup] error getting doc ${fs_doc._id}`);		// something really did go wrong!!
					errs.push(err_getDoc);
					return cb_createDocs();
				}

				// --- Does exist ---- //
				else {

					// ---- Design docs get checked for exact matches ---- //
					if (fs_doc._id.indexOf('_design') === 0) {								// its a design doc
						if (t.misc.are_design_docs_equal(fs_doc, resp_getDoc)) {
							logger.debug(`[db startup] design doc: ${fs_doc._id} in db: ${db_name} is okay`);
							return cb_createDocs();
						} else {
							logger.warn(`[db startup] updating design doc: ${resp_getDoc._id} in db: ${db_name}`);
							fs_doc._rev = resp_getDoc._rev;									// copy rev from latest version
							writeDoc(read_wr_opts, t.misc.sortKeys(fs_doc), (w_err) => {
								if (w_err) { errs.push(w_err); }
								return cb_createDocs();
							});
						}
					}

					// ---- Settings doc is handled differently ---- //
					else if (fs_doc._id === process.env.SETTINGS_DOC_ID) {
						if (resp_getDoc.ignore_config_file === true) {
							logger.warn('[db startup] settings doc has "ignore_config_file": true. will not overwrite settings doc w/config');
							return cb_createDocs();
						} else {
							if (!setup.detect_obj_changes(t.config_file, fs_doc, resp_getDoc)) {	// detect if there are changes, edits resp_getDoc
								logger.debug(`[db startup] settings doc: ${resp_getDoc._id} in db: ${db_name} is okay`);
								return cb_createDocs();
							} else {
								logger.warn(`[db startup] updating settings doc: ${resp_getDoc._id} in db: ${db_name}`);
								writeDoc(read_wr_opts, t.misc.sortKeys(resp_getDoc), (w_err) => {
									if (w_err) { errs.push(w_err); }
									return cb_createDocs();
								});
							}
						}
					}

					// ---- All Other Docs here ---- //
					else {
						if (t.misc.are_design_docs_equal(fs_doc, resp_getDoc)) {
							logger.debug(`[db startup] design doc: ${fs_doc._id} in db: ${db_name} is okay`);
							return cb_createDocs();
						} else {
							logger.warn(`[db startup] editing doc: ${resp_getDoc._id} in db: ${db_name}`);
							fs_doc._rev = resp_getDoc._rev;									// copy rev from latest version
							writeDoc(read_wr_opts, t.misc.sortKeys(fs_doc), (w_err) => {	// do not use sortItOut, need to preserve array order
								if (w_err) { errs.push(w_err); }
								return cb_createDocs();
							});
						}
					}
				}
			});
		}, (e) => {
			cb(e, null);
		});
	};

	// check if we need changes to the settings doc - edits db_doc
	setup.detect_obj_changes = (config_file, default_doc, db_doc) => {
		let changes_done = false;
		if (!default_doc) {
			default_doc = {};		// init
		}
		if (!db_doc) {
			db_doc = {};
		}

		// first check if config fields need to be copied to the settings file
		for (let key in config_file) {																	// copy config file setting -> default doc
			db_doc[key] = fix_differences(config_file[key], db_doc[key], key, key, 0);
		}

		// next see if there are missing fields from the default settings doc
		const missing_fields = addMissingProperties(default_doc._id, default_doc, db_doc);			// checks doc w/template and adds any missing properties
		if (missing_fields) {
			changes_done = true;
		}

		return changes_done;

		// check if all the properties in the config yaml (a) are in the existing settings doc (b) - recursive
		function fix_differences(a_field, b_field, field_name, key, depth) {
			if (depth >= 100) {																			// forever loop watchdog
				return b_field;
			}

			if (t.misc.isObject(a_field)) {
				if (!t.misc.isObject(b_field)) {														// if b is not an object, but a is, replace b
					logger.warn('[db startup] settings doc has different value for object field "' + field_name + '" in', default_doc._id);
					changes_done = true;
					return a_field;
				} else if (typeof b_field === 'undefined' || b_field === null) {						// null or undefined must replace b
					changes_done = true;
					logger.warn('[db startup] settings doc is missing field "' + field_name + '"');
					return a_field;
				} else {
					for (let inner_key in a_field) {													// if a && b are objects, iter through inner fields
						b_field[inner_key] = fix_differences(a_field[inner_key], b_field[inner_key], field_name + '.' + inner_key, inner_key, ++depth);
					}
					return b_field;
				}
			} else if (a_field !== b_field) {
				logger.warn('[db startup] settings doc has different value for field "' + field_name + '" in', default_doc._id);
				changes_done = true;
				return a_field;
			}

			return b_field;																				// no changes
		}
	};

	// check if all the properties in the default doc are in the existing settings doc - returns true if fields are missing
	function addMissingProperties(doc_id, default_doc, existing_doc) {
		let missing_fields = false;
		if (t.misc.isObject(default_doc) && t.misc.isObject(existing_doc)) {
			const doc_keys = Object.keys(default_doc);
			const existing_doc_keys = Object.keys(existing_doc);
			for (let i = 0; i < doc_keys.length; i++) {
				const field = doc_keys[i];
				if (typeof default_doc[field] === 'object' && !Array.isArray(default_doc[field])) {
					const innerChanges = addMissingProperties(doc_id, default_doc[field], existing_doc[field]);
					if (innerChanges === true) {
						existing_doc[field] = default_doc[field];
						missing_fields = true;
					}
				}
				if (!existing_doc_keys.includes(field)) {
					existing_doc[field] = default_doc[field];
					logger.warn('[db startup] adding missing field "' + field + '" in', doc_id);
					missing_fields = true;
				}
			}
		}
		return missing_fields;
	}

	// update the doc
	function writeDoc(opts, doc, cb) {
		couch_lib.repeatWriteSafe(opts, (doc_from_write) => {
			if (doc_from_write && doc_from_write._rev) {
				doc._rev = doc_from_write._rev;				// don't merge, just force overwrite by grabbing the existing doc's rev
			}
			return { doc: doc };
		}, (err) => {
			if (err) {
				logger.error('[db startup] error creating doc', err);
				return cb(err);
			} else {
				return cb(null);
			}
		});
	}

	return setup;
};
