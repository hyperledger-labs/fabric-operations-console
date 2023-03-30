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
		},

		// name of the patch
		/*'auto_upgrade_orderers': {

			// description of the patch, gets stored in patch doc
			purpose: 'this patch upgrades older orderers fabric versions',

			// the actual patch function/code
			patch: auto_upgrade_orderers,
		}*/

		// name of the patch
		'rebuild_safelist2': {

			// description of the patch, gets stored in patch doc
			purpose: 'this patch rebuilds the hostname safe list to include ports',

			// the actual patch function/code
			patch: rebuild_safelist,
		},
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

		if (ev.IMPORT_ONLY) {
			return cb(null, { message: 'skipped b/c import only' });	// an import only console cannot ask deployer, there isn't a deployer
		}

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

	// ----------------------------------------------------------------------------------
	// Patch 2 - 03/20/2020
	// this patch upgrades orderer that are older than < 1.4.9 or < 2.2.1
	// (the upgrade will NOT upgrade past major version changes)
	/*
	opts: {
		"manual": true || false					// if its manual, we ignore the DISABLE_AUTO_FAB_UP setting
	}
	*/
	// ----------------------------------------------------------------------------------
	patch.auto_upgrade_orderers = (opts, cb) => {
		if (!cb) {
			cb = function () { };
		}
		if (!opts) {
			opts = {};
		}
		let wait_interval = null;

		if (ev.DISABLE_AUTO_FAB_UP && !opts.manual) {
			logger.debug('[fab upgrade] auto fabric upgrade is disabled via setting. skipping.');
		} else {
			logger.debug('[fab upgrade] starting fabric upgrade check. looking for comps lower than:', ev.AUTO_FAB_UP_VERSIONS);

			// get a lock if we can, prevents multiple athena instances from doing the same logic
			t.lock_lib.apply({ lock: ev.STR.FAB_UP_LOCK_NAME, max_locked_sec: 5 * 60 }, (lock_err) => {
				if (lock_err) {
					logger.warn('[fab upgrade] unable to get lock for fabric upgrade check');
					return cb();
				} else {

					// starts here
					logger.debug('[fab upgrade] got lock. looking for old orderers');
					get_available_fabric_versions((ver_errs, versions) => {
						const orderer_keys = (versions && versions.orderer) ? Object.keys(versions.orderer) : [];
						logger.debug('[fab upgrade] orderer versions available:', orderer_keys);

						if (orderer_keys.length === 0) {
							logger.error('[fab upgrade] unable to find available orderer versions for fab upgrade.', orderer_keys);
							t.lock_lib.release(ev.STR.FAB_UP_LOCK_NAME);
							return cb();
						} else {

							// get the orderer docs
							get_orderers((errors, orderer_docs) => {
								auto_fabric_upgrade(orderer_keys, orderer_docs, () => {
									t.lock_lib.release(ev.STR.FAB_UP_LOCK_NAME);
									return cb();
								});
							});
						}
					});
				}
			});
		}

		// get the fabric versions from deployer
		function get_available_fabric_versions(dep_cb) {
			const fake_req = {
				query: {},
				headers: {},
				_skip_cache: true,
			};
			t.deployer.get_fabric_versions(fake_req, (err, resp) => {
				return dep_cb(err, resp ? resp.versions : null);
			});
		}

		// get all orderers
		function get_orderers(get_cb) {
			const opts = {
				db_name: ev.DB_COMPONENTS,
				_id: '_design/athena-v1',
				view: '_doc_types',
				SKIP_CACHE: true,
				query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.ORDERER] }),
			};

			t.otcc.getDesignDocView(opts, (err, resp) => {
				if (err) {
					logger.error('[fab upgrade] error getting orderers:', err);
					return get_cb(err, []);					// always emit array
				} else {
					const docs = [];
					if (resp) {
						for (let i in resp.rows) {
							if (resp.rows[i] && resp.rows[i].doc) {
								let component_doc = resp.rows[i].doc;

								// only include deployed orderers
								if (component_doc && component_doc.location === ev.STR.LOCATION_IBP_SAAS) {
									docs.push(component_doc);
								}
							}
						}
					}

					logger.debug('[fab upgrade] found all deployed orderers:', docs.length);
					return get_cb(null, docs);
				}
			});
		}

		// send upgrade fabric calls (it checks the version && cert expirations first)
		function auto_fabric_upgrade(available_orderer_versions, orderer_docs, up_cb) {
			t.async.eachLimit(orderer_docs, 1, (comp_doc, async_cb) => {

				// find the auto upgrade version setting that applies to this component (the one with the same major number)
				const auto_up_version = highest_version_available(ev.AUTO_FAB_UP_VERSIONS, comp_doc.version);
				const upgrade_to_version = highest_patch_available(available_orderer_versions, auto_up_version);
				if (!upgrade_to_version) {
					logger.error('[fab upgrade] there are no non-major version upgrades to use... @version', comp_doc.version,
						'available:', available_orderer_versions);
					return async_cb();
				}
				logger.debug('[fab upgrade] looking at component:', comp_doc._id, 'with version:', comp_doc.version);

				should_upgrade(upgrade_to_version, comp_doc, (_, should_do_upgrade) => {
					if (!should_do_upgrade) {
						logger.debug('[fab upgrade] version okay. will not upgrade comp:', comp_doc._id, 'version:', comp_doc.version);
						return async_cb();
					} else {
						logger.debug('[fab upgrade] upgrading comp:', comp_doc._id, 'version:', comp_doc.version, 'to version:', upgrade_to_version);

						const fake_req = {
							params: {
								athena_component_id: comp_doc._id
							},
							headers: {},
							session: {},
							body: {
								version: upgrade_to_version				// this is the version we will upgrade to
							}
						};
						logger.debug('[fab upgrade] sending body for fab upgrade:', JSON.stringify(fake_req.body));
						t.deployer.update_component(fake_req, (err_resp, resp) => {
							if (err_resp) {
								logger.error('[fab upgrade] failed to upgrade component. dep error.', comp_doc._id, err_resp);
								return async_cb(err_resp, resp);
							} else {
								logger.debug('[fab upgrade] successfully upgraded component:', comp_doc._id, err_resp);
								wait_for_start(comp_doc, (start_err) => {
									if (start_err) {
										logger.error('[fab upgrade] failed to start comp after update. all stop.', start_err);
										return async_cb(start_err, resp);
									} else {
										logger.debug('[fab upgrade] component has started:', comp_doc._id);
										return async_cb(null, resp);
									}
								});
							}
						});
					}
				});
			}, (auto_error) => {
				if (auto_error) {
					logger.error('[fab upgrade] blocking error occurred during auto fabric update. stopping auto fab updates.');
				}
				return up_cb();
			});
		}

		// find the auto upgrade version that applies to this orderer.
		// major digits must match
		function highest_version_available(available_versions, at_version) {
			const at_major_ver = get_major(at_version);
			const possible_arr = [];
			for (let i in available_versions) {
				if (get_major(available_versions[i]) === at_major_ver) {
					possible_arr.push(available_versions[i]);
				}
			}

			if (possible_arr.length === 0) {
				return null;
			} else {
				return t.misc.get_highest_version(possible_arr);
			}
		}

		// find the highest version we can use to upgrade this orderer.
		// do not move up major or minor versions, only patch and pre-releases.
		function highest_patch_available(available_versions, auto_version) {
			const at_major_ver = get_major(auto_version);
			const at_minor_ver = get_minor(auto_version);
			const possible_arr = [];
			for (let i in available_versions) {
				if (get_major(available_versions[i]) === at_major_ver && get_minor(available_versions[i]) === at_minor_ver) {
					possible_arr.push(available_versions[i]);
				}
			}

			if (possible_arr.length === 0) {
				return null;
			} else {
				return t.misc.get_highest_version(possible_arr);
			}
		}

		// get the first number off the version, the major digits
		function get_major(version) {
			const parts = (version && typeof version === 'string') ? version.split('.') : [];
			return parts.length > 0 ? parts[0] : null;
		}

		// get the second number off the version, the minor digits
		function get_minor(version) {
			const parts = (version && typeof version === 'string') ? version.split('.') : [];
			return parts.length > 1 ? parts[1] : null;
		}

		// based on the component doc version && cert expirations, should we upgrade this component
		function should_upgrade(upgrade_to_version, comp_doc, cb) {
			if (!comp_doc || !comp_doc.version) {
				logger.warn('[fab upgrade] unexpected error, missing comp doc or "version" field');
				return cb(null, false);
			} else {

				// find the auto upgrade version setting that applies to this component (the one with the same major number)
				const auto_up_version = highest_version_available(ev.AUTO_FAB_UP_VERSIONS, comp_doc.version);

				// this component is at a version beyond all auto upgrade versions - (this shouldn't happen for decades)
				// this component should not be upgraded
				if (!auto_up_version) {
					logger.debug('[fab upgrade] there are no auto-upgrade version settings that have the same major as comp. version:', comp_doc.version);
					return cb(null, false);
				}

				// the version in "auto_up_version" is okay, any lower is not
				// this component should not be upgraded - comp version is above settings
				else if (!t.misc.is_version_b_greater_than_a(comp_doc.version, auto_up_version)) {
					logger.debug('[fab upgrade] fab version is at or above the auto-upgrade setting. comp:', comp_doc._id, 'version:', comp_doc.version);
					return cb(null, false);
				}

				// the version in "upgrade_to_version" is okay, any lower is not
				// this component should not be upgraded - comp version is above all available versions - (not likely to ever happen)
				else if (!t.misc.is_version_b_greater_than_a(comp_doc.version, upgrade_to_version)) {
					logger.debug('[fab upgrade] fab version is at or above the max available fab version. comp:', comp_doc._id, 'version:', comp_doc.version);
					return cb(null, false);
				}

				// this version should be upgraded if the tls cert is near expiration
				else {
					tls_certs_near_expiration(comp_doc, (errors, is_near_expiration) => {
						if (is_near_expiration) {
							logger.warn('[fab upgrade] tls cert for comp IS near expiration. comp:', comp_doc._id);
						} else {
							logger.debug('[fab upgrade] tls cert for comp is not near expiration. comp:', comp_doc._id);
						}
						return cb(null, is_near_expiration);
					});
				}
			}

			// check if the tls certs are near expiration
			function tls_certs_near_expiration(component_doc, cert_cb) {
				// get the cert from deployer's api response
				get_comps_tls_cert_from_deployer(component_doc, (_, tls_cert) => {
					if (!tls_cert) {
						logger.error('[fab upgrade] unable to get tls cert for auto fab upgrade check, skipping component');
						return cert_cb(null, false);
					} else {
						const too_close_to_expiration_ms = ev.AUTO_FAB_UP_EXP_TOO_CLOSE_DAYS * 24 * 60 * 60 * 1000;
						if (t.misc.cert_is_near_expiration(tls_cert, too_close_to_expiration_ms, component_doc._id)) {
							return cert_cb(null, true);
						} else {
							return cert_cb(null, false);
						}
					}
				});
			}
		}

		// wait for the orderer to start up
		function wait_for_start(comp_doc, started_cb) {
			const athena_component_id = comp_doc._id;
			logger.debug('[fab upgrade] waiting for comp to start...', athena_component_id);

			clearInterval(wait_interval);
			wait_interval = setInterval(() => {
				logger.debug('[fab upgrade] waiting for comp to start...', athena_component_id);
			}, 4000);

			// delay the startup check to allow the upgrade to get started....
			setTimeout(() => {
				const opts = {
					comp_doc: comp_doc,
					desired_max_ms: 5 * 60 * 1000,					// timeout for all retries of the status api check
				};
				t.ot_misc.wait_for_component(opts, (errors) => {
					clearInterval(wait_interval);
					return started_cb(errors); //{ error: 'did not start in time' });
				});
			}, 10000);
		}
	};

	// ----------------------------------------------------------------------------------
	// Patch 3 - 03/24/2023
	// this patch rebuilds the url whitelist to include ports
	// ----------------------------------------------------------------------------------
	function rebuild_safelist(cb) {
		if (!cb) {
			cb = function () { };
		}
		logger.debug('[patch] going to run "rebuild_safelist"');
		t.component_lib.rebuildWhiteList({}, (rebuild_errors) => {

			t.otcc.getDoc({ db_name: ev.DB_SYSTEM, _id: process.env.SETTINGS_DOC_ID, SKIP_CACHE: true }, (err, settings_doc) => {
				if (err || !settings_doc) {
					logger.error('[patch lib] could not get settings doc to clear old safe list', err);
					return cb(rebuild_errors);
				} else {

					// update the settings doc
					delete settings_doc.host_white_list;
					t.otcc.writeDoc({ db_name: ev.DB_SYSTEM }, settings_doc, (err_writeDoc, doc) => {
						if (err_writeDoc) {
							logger.error('[patch lib] cannot edit settings doc to clear old safe list:', err_writeDoc);
						}
						return cb(rebuild_errors);
					});
				}
			});
		});
	}

	return patch;
};
