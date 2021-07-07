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
// patch_lib.js - Library to apply patches to prior athenas - like change format of the db docs
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const patch = {};
	const FAIL = 'failure';
	const GOOD = 'good';

	// list all patches here
	// patches will run (on startup) if they have not yet completed with a "outcome" of GOOD
	patch.list = {

		// name of the patch
		'fix_tls_cert': {

			// description of the patch, gets stored in patch doc
			purpose: 'this patch converts old "tls_cert" fields into "tls_ca_root_cert" fields and gets a valid "tls_cert" from deployer',

			// the actual patch function/code
			patch: fix_tls_cert,
		}
	};

	//--------------------------------------------------
	// run through all patches - runs in app.js on process start
	//--------------------------------------------------
	patch.apply = (cb) => {
		if (!cb) { cb = () => { }; }													// init

		t.async.eachOfLimit(patch.list, 1, (patch_obj, patch_name, cb_patch) => {		// run 1 at a time to avoid conflicts
			patch.already_applied({ name: patch_name }, (err, patch_doc) => {
				if (err || !prev_run_succeeded(patch_doc)) {							// re-run this patch
					logger.debug('[patch] running "' + patch_name + '"');
					patch.list[patch_name].patch((patch_err, patch_results) => {
						const opts = {
							name: patch_name,
							purpose: patch.list[patch_name].purpose,
							outcome: patch_err ? FAIL : GOOD,							// any errors means a failure
							results: patch_results,
							by: 'system',
							prev_doc: patch_doc,
						};
						patch.record(opts, () => {										// record the results of this patch
							cb_patch(null);
						});
					});
				} else {
					logger.debug('[patch] "' + patch_name + '" was already completed in the past, skipping');
					cb_patch(null);
				}
			});
		}, () => {
			return cb();																// all done
		});

		// return true if the previous time was a success
		function prev_run_succeeded(doc) {
			if (doc && doc.outcome === GOOD) {
				return true;
			}
		}
	};

	//--------------------------------------------------
	// record that we ran this patch - makes a doc in the system db
	//--------------------------------------------------
	/*
	opts:{
		name: "<name of the patch>",
		purpose: "<why was this done>",
		outcome: "success" || "failure",
		results: {},
		by: "<who ran it>",
		prev_doc: {}, 								// the previous patch doc
	}
	*/
	patch.record = (opts, cb) => {
		const doc = {
			_id: build_patch_id(opts.name),
			_rev: opts.prev_doc ? opts.prev_doc._rev : undefined,	// use undefined, b/c when we stringify it will disappear
			purpose: opts.purpose,
			outcome: opts.outcome,
			details: opts.prev_doc ? opts.prev_doc.details : [],	// use the old details if available, else init to empty array
			by: opts.by,
			type: 'patch_doc',
		};
		doc.details.push({
			timestamp: Date.now(),
			results: opts.results
		});
		t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, t.misc.sortKeys(doc), (err_writeDoc, resp_writeDoc) => {
			if (err_writeDoc) {
				logger.error('[patch] could not write doc', err_writeDoc);
				return cb(err_writeDoc);
			} else {
				logger.debug('[patch] wrote doc to record patch:', opts.name);
				return cb(null, resp_writeDoc);
			}
		});
	};

	//--------------------------------------------------
	// detect if we already ran this patch
	//--------------------------------------------------
	/*
	opts:{
		name: "<name of the patch>"
	}
	*/
	patch.already_applied = (opts, cb) => {
		get_patch_doc(opts.name, (err, doc) => {
			if (err || !doc) {
				return cb({ error: 'unable to return doc' });
			} else {
				return cb(null, doc);
			}
		});
	};

	// build a doc id for the patch by its name
	function build_patch_id(name) {
		return '02_' + name;
	}

	// get the doc that recorded patching
	function get_patch_doc(name, cb) {
		const get_opts = {
			db_name: ev.DB_SYSTEM,
			_id: build_patch_id(name),
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (err_getDoc, resp_getDoc) => {
			return cb(err_getDoc, resp_getDoc);
		});
	}

	// ----------------------------------------------------------------------------------
	// Patch 1 - 03/20/2020
	// converts old "tls_cert" fields in the db into "tls_ca_root_cert" fields and gets a valid "tls_cert" from deployer
	// ----------------------------------------------------------------------------------
	function fix_tls_cert(cb) {
		logger.debug('[patch] going to run "fix_tls_cert"');
		const results = {
			message: '',
			success: [],
			skipped: [],
			errors: [],
			status: GOOD,										// default as a success, optimistic
			debug: [],
		};

		t.component_lib.get_all_components({ _skip_cache: true }, (err, comp_docs) => {
			if (err) {
				if (t.ot_misc.get_code(err) !== 222) {
					results.message = 'unable to retrieve all component docs';
					results.status = FAIL;
					return cb(results, null);
				} else {										// a failure of 222 means there are no component docs, athena is brand new, patch does not apply
					results.message = 'db is empty. no docs to apply patch.';
					return cb(null, results);
				}
			} else {

				// iter on each component, a few at a time
				t.async.eachLimit(comp_docs.components, 4, (component_doc, cb_patch) => {
					if (component_doc.type !== ev.STR.CA && component_doc.type !== ev.STR.PEER && component_doc.type !== ev.STR.ORDERER) {
						results.skipped.push({ id: component_doc._id, msg: 'skipping b/c of type' });
						return cb_patch();														// its not a component that would have a tls_cert, skip
					} else {

						// get the cert from deployer's api response
						get_comps_tls_cert_from_deployer(component_doc, (_, tls_cert) => {
							results.debug.push({ id: component_doc._id, tls_cert_from_dep: tls_cert });
							const edited_doc = doc_needs_changes(component_doc, tls_cert);		// decide if we need to edit the tls_cert field in the doc
							if (edited_doc) {

								// edit the doc in the db
								t.otcc.writeDoc({ db_name: ev.DB_COMPONENTS }, t.misc.sortKeys(edited_doc), (err_writeDoc, resp_writeDoc) => {
									if (err_writeDoc) {
										logger.error('[patch] unable to edit component to fix tls_cert...', err_writeDoc);
										results.errors.push({ id: component_doc._id, msg: 'unable to edit doc', error: err_writeDoc });
										results.status = FAIL;
										return cb_patch();
									} else {
										logger.debug('[patch] successfully edited component to fix tls_cert, id:', component_doc._id);
										results.success.push({ id: component_doc._id, msg: 'edited doc' });
										return cb_patch();
									}
								});

								// nothing needs to be done b/c cert fields already okay
							} else {
								results.skipped.push({ id: component_doc._id, msg: 'did not need changes' });
								return cb_patch();
							}
						});
					}
				}, () => {
					logger.debug('[patch] finished tls_cert fix. results', JSON.stringify(results));			// all done
					if (results.status === FAIL) {
						results.message = 'completed with errors';
						return cb(results);
					} else {
						results.message = 'completed without errors';
						return cb(null, results);
					}
				});
			}
		});

		// we expect a "tls_cert" in our db to match the deployer's get-component api response
		// if not, copy it to "tls_ca_root_cert" and replace "tls_cert" w/deployer's response
		function doc_needs_changes(component_doc, dep_tls_cert) {
			logger.debug('[patch] looking at component id:', component_doc._id);
			let db_tls_cert_parsed = (component_doc && component_doc.tls_cert) ? t.ot_misc.parseCertificate(component_doc.tls_cert) : null;
			const dep_tls_cert_parsed = dep_tls_cert ? t.ot_misc.parseCertificate(dep_tls_cert) : null;

			if (!db_tls_cert_parsed) {
				logger.debug('[patch] tls cert in db is not parsable or missing for component id:', component_doc._id, component_doc.type);
				db_tls_cert_parsed = {};												// if unable to parse existing cert, init blank obj
			}

			if (!dep_tls_cert_parsed) {
				logger.warn('[patch] tls cert from deployer is not parsable or missing for component id:', component_doc._id, component_doc.type);
			}

			if (dep_tls_cert_parsed) {													// parse the certs, then compare serials, more accurate
				if (db_tls_cert_parsed.serial_number_hex !== dep_tls_cert_parsed.serial_number_hex) {	// if it doesn't match, it doesn't belong here
					logger.debug('[patch] tls_cert does not match, switching.', db_tls_cert_parsed.serial_number_hex, dep_tls_cert_parsed.serial_number_hex);

					// assume the value in parsed tls_cert is a root cert, its at least not a tls cert
					component_doc.tls_ca_root_cert = db_tls_cert_parsed.base_64_pem;	// copy, if undefined b/c field un-parsable it will drop after stringify
					component_doc.tls_cert = dep_tls_cert;
					return component_doc;												// cert switch is done, return edited doc
				}
			}

			if (dep_tls_cert) {															// if deployer has a cert, but the db doesn't, copy deployer's
				if (component_doc && !component_doc.tls_cert) {
					logger.debug('[patch] tls_cert in db is missing, copying from deployer, id:', component_doc._id);
					component_doc.tls_cert = dep_tls_cert;
					return component_doc;												// cert is populated, return edited doc
				}
			}

			// skip CA's b/c we don't store tls_ca_root_cert... though maybe we should. dsh todo
			if (component_doc.type !== ev.STR.CA && !component_doc.tls_ca_root_cert) {	// doesn't do anything, just logs the missing field for visibility
				logger.warn('[patch] tls_ca_root_cert is missing for component id:', component_doc._id, component_doc.type);
			}

			return null;														// no doc edits were done, return null
		}

		// populate the tls_cert field in the component doc with a value from deployer
		function get_comps_tls_cert_from_deployer(comp_doc, cb_dep) {
			const req_opts = {
				_component_doc: comp_doc, 		// required
				_skip_cache: true,
				session: {},
				params: {
					athena_component_id: comp_doc._id,
				}
			};
			t.deployer.get_component_api(req_opts, (dep_err, dep_data) => {
				if (dep_err) {
					logger.warn('[patch] error getting deployer data on component', dep_err);
				}

				let conformed_deployer_data = null;
				if (dep_data) {
					conformed_deployer_data = t.comp_fmt.conform_deployer_field_names(null, dep_data);		// convert field names
				}
				return cb_dep(null, conformed_deployer_data ? conformed_deployer_data.tls_cert : null);		// only need the cert
			});
		}
	}

	return patch;
};
