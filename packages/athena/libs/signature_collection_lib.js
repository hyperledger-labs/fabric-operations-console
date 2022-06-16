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
// signature_collection_lib.js - signature collection functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	// format sig collection doc
	function format_sig_tx(the_doc) {
		the_doc.tx_id = the_doc._id || the_doc.tx_id;
		delete the_doc._id;
		delete the_doc._rev;
		delete the_doc.type;

		if (!the_doc.visibility) {
			the_doc.visibility = ev.STR.TX_INBOX;
		}

		for (let i in the_doc.distribution_responses) {
			if (the_doc.distribution_responses[i]) {
				delete the_doc.distribution_responses[i]._req;
			}
		}
		delete the_doc.auth_header;
		the_doc.tx_type = the_doc.tx_type || ev.STR.TX_CHANNEL;

		return the_doc;
	}

	//-------------------------------------------------------------
	// get all signature collections docs
	//-------------------------------------------------------------
	exports.getSignatureCollectionsDocs = (req, cb) => {
		const opts = {
			db_name: ev.DB_COMPONENTS,			// db for peers/cas/orderers/msps/etc docs
			_id: '_design/athena-v1',			// name of design doc
			view: '_by_types_and_timestamp',
			SKIP_CACHE: t.ot_misc.skip_cache(req),
			query: t.misc.formatObjAsQueryParams({
				include_docs: true,
				startkey: [ev.STR.SIG_COLLECTION + ', {}'],
				endkey: [ev.STR.SIG_COLLECTION],
				descending: true
			}),
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[signature collection] error response from couch when getting sig docs:', err, resp);
				return cb(err);
			} else {
				const ret = [];
				if (resp) {
					for (let i in resp.rows) {
						ret.push(resp.rows[i].doc);
					}
				}
				return cb(null, ret);
			}
		});
	};

	//-------------------------------------------------------------
	// get all signature collections txs (formatted docs) - open and closed
	//-------------------------------------------------------------
	/*
		req:{
			query: {

				// [optional] defaults to included all orderers
				filter_orderers: ["n98af1c-ordererC0f1661-proxy.ibpv2-test-cluster.us-south.containers.appdomain.cloud:3010"]

				// [optional] defaults to "included", else "omitted" will only show a summary of the tx doc
				full_details: "included"

				// [optional]
				group_by: "channels" or "none"
			}
		}
	*/
	exports.getSignatureCollections = (req, cb) => {
		exports.getSignatureCollectionsDocs(req, (err, array_of_docs) => {
			if (err) {
				// error already logged
				return cb(err);
			} else {
				if (array_of_docs && array_of_docs.length === 0) {
					logger.warn('[signature collection] no sig docs found:', array_of_docs);
					return cb({ statusCode: 404, msg: 'no transactions exist', reason: 'missing' });
				} else {
					const filter_by_orderer_hosts = t.misc.fmt_arr_of_strings_query_param(req, 'filter_orderers');
					const filter_by_status = exports.detect_status_filter(req);
					const ret = {
						signature_collections: filter_results(filter_by_orderer_hosts, filter_by_status, array_of_docs)
					};

					if (ret.signature_collections.length === 0) {
						logger.warn('[signature collection] no sig docs found after filtering:', filter_by_orderer_hosts);
						return cb({ statusCode: 404, msg: 'no transactions exist after filter', reason: 'missing' });
					} else {

						if (exports.group_query_param_is_set(req)) {
							ret.signature_collections = {
								channels: group_channels(ret.signature_collections)		// overwrite output
							};
						}

						return cb(null, ret);
					}
				}
			}
		});

		// filter signature docs
		function filter_results(filter_by_orderer_hostnames, filter_by_status, array_of_docs) {
			const signature_collections = [];
			for (let i in array_of_docs) {

				// if orderer filter is not set, or it is set and matches doc...
				if (!filter_by_orderer_hostnames || str_in_array1_partial_in_array2(filter_by_orderer_hostnames, array_of_docs[i].orderers)) {

					// if status filter is not set, or it is set and matches doc...
					if (!filter_by_status || filter_by_status === array_of_docs[i].status) {

						// add the data
						if (exports.include_full_details(req)) {
							signature_collections.push(format_sig_tx(array_of_docs[i]));
						} else {
							const simple_obj = {
								channel: array_of_docs[i].channel,
								tx_id: array_of_docs[i]._id,
								timestamp: array_of_docs[i].timestamp,
								status: array_of_docs[i].status,
								orderers: array_of_docs[i].orderers
							};
							signature_collections.push(simple_obj);
						}
					}
				}
			}

			return signature_collections;
		}

		// test if a string in array1 *partially* exists in a second array of strings.
		// we want to use partial comparison b/c the orderer's url int he doc might be a internal proxy route
		// so ["example.com"] would match both entries of ["http://localhost:3000/grpcwp/https%3A%2F%example.com", "https://example.com]
		function str_in_array1_partial_in_array2(array1, array2) {
			if (Array.isArray(array1) && Array.isArray(array2)) {
				for (let i in array1) {
					for (let x in array2) {
						if (array2[x].includes(array1[i])) {			// a partial is good enough
							return true;
						}
					}
				}
			}
			return false;
		}

		// detect if the group by channels query parameter is set
		function group_channels(sig_cols) {
			const channels = {};
			for (let i in sig_cols) {
				const id = sig_cols[i].channel;
				if (!channels[id]) {
					channels[id] = [];								// init
				}
				delete sig_cols[i].channel;
				channels[id].push(sig_cols[i]);						// push it here
			}
			return channels;
		}
	};

	// detect if we should return full sig collection details or not - from query param
	exports.include_full_details = function (req) {
		if (req && req.query && req.query.full_details === 'omitted') {
			return false;
		}
		return true;
	};

	// detect if we should filter out tx docs - from query param
	exports.detect_status_filter = function (req) {
		if (req && req.query && req.query.status) {
			if (req.query.status === 'all') {				// "all" means do not filter
				return false;
			} else {
				return req.query.status;
			}
		}
		return false;
	};

	// detect if the group by channels query parameter is set
	exports.group_query_param_is_set = (req) => {
		if (req && req.query && req.query.group_by && req.query.group_by === 'channels') {
			return true;
		}
		return false;
	};

	// get one signature collection
	exports.getSignatureCollectionById = (id, cb) => {
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: id,
		};
		t.otcc.getDoc(get_opts, (error, doc) => {
			if (error) {										// error getting doc
				logger.error('[signature collection] could not get the sig collection doc', id);
				return cb(error);
			} else {
				return cb(null, t.misc.sortKeys(format_sig_tx(doc)));
			}
		});
	};

	//--------------------------------------------------
	// Functions for create and append Store Collection
	//--------------------------------------------------
	/*
	req = {
		params: {
			tx_id: "" [required - create only] will be used to identify the sig collection
		},
		body: {}
	}
	isAppend = boolean					// if we are appending to a sig collection or creating
	*/
	exports.createOrAppendSignature = (req, isAppend, cb_fromAPI) => {
		if (!isAppend) {
			logger.info('[signature collection] attempting to create a signature collection');
		} else {
			logger.info('[signature collection] attempting to edit a signature collection');
		}
		const signatureRequest = JSON.parse(JSON.stringify(req.body));
		const tx_id = req.params.tx_id || signatureRequest.tx_id;
		let tx_type = null; 										// populated later

		// 1. get things (tx doc, msp docs)
		t.async.parallel([

			// ---- Get the sig col doc if applicable results[0] ---- //
			(join) => {
				get_sig_col_doc((error, doc) => {
					return join(error, doc);
				});
			},

			// ---- Get MSP docs results[1] ---- //
			(join) => {
				exports.getAllPartyData((err_get, allPartyData) => {
					if (err_get) {
						logger.error('[signature collection] problem getting msp/org docs', err_get);
						return join({ statusCode: 500, msg: 'problem loading external parties' });
					} else {
						return join(null, allPartyData);
					}
				});
			}

		], (error, results) => {
			if (error) {
				// error already logged
				return cb_fromAPI(error);
			} else {
				const sig_doc = results[0];
				const allPartyData = results[1];

				const pick_data = isAppend ? sig_doc : req.body;
				tx_type = (pick_data && pick_data.ccd) ? ev.STR.TX_CCD : ev.STR.TX_CHANNEL;

				// 2. validate proposal signatures in request (this is not the auth for the api request, it is the signature over the channel update tx)
				validate_proposal_signatures(sig_doc, allPartyData, (errors) => {
					if (errors.length > 0) {										// no signature successfully validated
						logger.error('[signature collection] at least 1 signature failed validation - cannot create collection. tx_type:', tx_type, tx_id);
						return cb_fromAPI({
							statusCode: 400,
							msg: JSON.stringify(errors),
						});
					} else {
						logger.debug('[signature collection] validated all signatures in request. tx_type:', tx_type, tx_id);

						// 3. distribute the new request to external athenas
						handle_distribution(sig_doc, (_, all_distribution_resps) => {
							const sig_col_data = isAppend ? sig_doc : req.body;			// during append we already have the doc, else use data in request

							// 4. build the doc
							let doc_to_write = build_sig_collection_doc(req, isAppend, sig_col_data);
							doc_to_write.distribution_responses = all_distribution_resps;
							doc_to_write = append_signatures(doc_to_write);

							// build a notification doc
							const notice = { message: 'creating a signature collection for channel ' + doc_to_write.chanel };
							if (isAppend) {
								notice.message = 'edited a signature collection for channel ' + doc_to_write.chanel;
							}
							t.notifications.procrastinate(req, notice);

							// 5. write doc to db
							writeSignatureCollectionDoc(req, isAppend, doc_to_write, (wr_er, wr_resp) => {
								t.component_lib.rebuildWhiteList(req, () => {			// add peers if applicable to the white list
									return cb_fromAPI(wr_er, wr_resp);
								});
							});
						});
					}
				});
			}
		});

		// get the signature collection doc by tx_id (even on create to see if id is taken)
		function get_sig_col_doc(cb) {
			const get_opts = {
				db_name: ev.DB_COMPONENTS,
				_id: tx_id,
				SKIP_CACHE: true
			};
			t.otcc.getDoc(get_opts, (err_getSigCollection, resp_getSigCollection) => {
				const error_code = t.ot_misc.get_code(err_getSigCollection);
				if (isAppend) {												// request is trying to append/edit the signature collection
					if (err_getSigCollection) {
						logger.error('[signature collection] error getting sig col doc [1]', error_code, err_getSigCollection);
						return cb({ statusCode: error_code, msg: `Problem getting the signature collection "${tx_id}"` });
					} else {
						logger.debug('[signature collection] sig col doc found for tx:', tx_id);
						return cb(null, resp_getSigCollection);
					}
				} else {													// request is trying to create the signature collection
					if (err_getSigCollection && error_code !== 404) {		// we expect 404's if tx_id dne yet and the request is creating a new tx
						logger.error('[signature collection] unexpected error getting sig col doc by tx_id [2]', tx_id, error_code, err_getSigCollection);
						return cb({ statusCode: error_code, msg: `Problem getting the signature collection "${tx_id}"` });
					} else if (!err_getSigCollection) {						// no error indicates the doc exists, which is a problem for a create request
						logger.error('[signature collection] signature collection doc already exists. cannot create doc w/id:', tx_id);
						return cb({ statusCode: 400, msg: `Signature collection already exists "${tx_id}"` });
					} else {
						return cb(null, null);								// doc by tx_id dne yet, good
					}
				}
			});
		}

		// merge the new signatures in the request w/the ones in the doc (only does work for append/edit)
		function append_signatures(sig_doc) {
			if (isAppend) {
				mergeSigWithDoc('orgs2sign');
				mergeSigWithDoc('orderers2sign');
			}
			return sig_doc;

			// copy signature from array
			function mergeSigWithDoc(sig_field) {
				if (sig_doc && req.body) {
					for (let i in req.body[sig_field]) {
						if (!sig_doc[sig_field]) {
							sig_doc[sig_field] = [];
						}
						const pos = orgPosInSigCollection(req.body[sig_field][i].msp_id, sig_doc[sig_field]);
						if (pos >= 0 && req.body[sig_field][i].signature) {							// org must be in doc and signature in request must exist
							const sig_timestamp = req.body[sig_field][i].timestamp || Date.now(); 	// if the signature's timestamp in req dne, init it
							if (sig_timestamp > sig_doc[sig_field][pos].timestamp) {
								sig_doc[sig_field][pos] = merge_fields(sig_doc[sig_field][pos], req.body[sig_field][i]);
							}
						} else if (pos === -1 && req.body[sig_field][i].signature) {				// org was not asked to sign, must be new, append it
							if (!req.body[sig_field][i].optools_url) {								// the url is required for this case
								logger.error('[sig col] org "', req.body[sig_field][i].msp_id, '" was not asked to sign. sig was provided but' +
									' request does not include the org\'s "optools_url". ignoring signature in', sig_field);
							} else {
								sig_doc[sig_field].push(req.body[sig_field][i]);					// append org to field
							}
						}
					}
				}
			}

			// overwrite fields in tx doc w/fields provided in body iff they are present.
			function merge_fields(doc_sig_entry, body_sig_entry) {
				if (doc_sig_entry && body_sig_entry) {
					const fields = ['signature', 'timestamp', 'optools_url', 'timeout_ms', 'package_id', 'peers'];
					for (let i in fields) {
						const field = fields[i];
						doc_sig_entry[field] = body_sig_entry[field] || doc_sig_entry[field];
					}

					// handle "admin" differently b/c it's a boolean
					doc_sig_entry.admin = (typeof body_sig_entry.admin === 'boolean') ? body_sig_entry.admin : doc_sig_entry.admin;
				}
				return doc_sig_entry;
			}
		}

		// validate each signature in the request
		function validate_proposal_signatures(sig_doc, allPartyData, cb) {
			let errors = [];
			const entities2signArr = signatureRequest.orderers2sign ?
				signatureRequest.orgs2sign.concat(signatureRequest.orderers2sign) : signatureRequest.orgs2sign;
			logger.debug('[signature collection] validating signatures in request. tx_type:', tx_type, tx_id);
			sig_doc = sig_doc || {};

			t.async.eachLimit(entities2signArr, 8, (orgObj, cb_validate) => {
				if (tx_type === ev.STR.TX_CCD) {							// there is no proposal signature for a ccd transaction
					return cb_validate();
				} else if (!orgObj.signature) {
					return cb_validate();									// no signature, skip
				} else {
					const msp_id = orgObj.msp_id;
					const verify_opts = {
						msp_id: msp_id,
						config_signature_b64: orgObj.signature,
						proposal_b64: isAppend ? sig_doc.proposal : signatureRequest.proposal,
						rootCerts_b64: exports.getCertsForMspId(allPartyData, msp_id),
					};
					let sig_errors = verifySignature(verify_opts);
					errors = errors.concat(sig_errors);
					return cb_validate();									// don't return error yet, collect them all
				}
			}, () => {
				return cb(errors);
			});
		}

		// find org's position in signature collection doc array (the array field is either orgs2sign or orderers2sign)
		// its okay to look at msp_id alone (and ignore the optools url) b/c msp ids in a single channel must be unique
		function orgPosInSigCollection(msp_id, asked_orgs) {
			if (msp_id && Array.isArray(asked_orgs)) {
				for (let i in asked_orgs) {
					if (asked_orgs[i].msp_id === msp_id) {
						return i;
					}
				}
			}
			return -1;
		}

		// decide if we need to distribute and to whom
		function handle_distribution(sigColDoc, cb_distributed) {
			sigColDoc = sigColDoc || {};
			req.body.distribute = isAppend ? (req.body.distribute || 'all') : (req.body.distribute || 'missing');	// different defaults
			const distribution_resps = sigColDoc.distribution_responses || req.body.distribution_responses || []; 	// init empty array if dne

			if (req.body.distribute !== 'none') {
				logger.debug('[signature collection] will distribute. setting:', req.body.distribute, 'tx_type:', tx_type, tx_id);
				const redistributeOpts = {
					sig_collection_doc: isAppend ? sigColDoc : null,				// pass sig doc if we have it (only used to get urls of external athenas)
					body: req.body,			// note - we can only send what was in the request (not the whole doc) b/c the signature is over the http req body
					isAppend: isAppend,
					tx_id: tx_id,
					authorize_header: req.authorize_header || req.body.auth_header,	// use same auth for this req OR provided auth in body
					method: isAppend ? 'PUT' : 'POST',
				};
				handle_each_distribution(redistributeOpts, (obj) => {
					distribution_resps.push({
						distribute: req.body.distribute,							// copy distribute setting in req to response obj
						destinations: obj.destinations,
						errors: obj.errors,
						successes: obj.successes,
						timestamp: Date.now(),
						_req: {
							auth_header: redistributeOpts.authorize_header,			// store for debug
							body: redistributeOpts.body,
							method: redistributeOpts.method,
						}
					});
					return cb_distributed(null, distribution_resps);
				});
			} else {
				logger.debug('[signature collection] will not redistribute. setting:', req.body.distribute, 'tx_type:', tx_type, tx_id);
				distribution_resps.push({
					distribute: 'none',												// this athena did not distribute anything, it only received
					destinations: [],
					errors: [],
					successes: [],
					timestamp: Date.now(),
					_req: {															// censor these from GET responses
						auth_header: req.authorize_header,							// store for debug
						body: req.body,
					}
				});
				return cb_distributed(null, distribution_resps);
			}
		}
	};

	// write the doc to the db
	function writeSignatureCollectionDoc(req, isAppend, doc_to_write, cb) {
		const wr_opts = {
			_id: doc_to_write._id,
			db_name: ev.DB_COMPONENTS,
			doc: doc_to_write
		};
		t.otcc.repeatWriteSafe(wr_opts, (doc_from_write) => {
			doc_to_write._rev = doc_from_write._rev;			// don't merge, just force overwrite by grabbing the existing doc's rev
			return { doc: doc_to_write };
		}, (err_repeatWriteSafe, doc_wrote) => {
			let fmt_doc = format_sig_tx(doc_wrote);
			fmt_doc.message = 'ok';								// add legacy field
			return cb(err_repeatWriteSafe, t.misc.sortKeys(fmt_doc));
		});
	}

	// init or edit the signature collection doc data
	function build_sig_collection_doc(req, isAppend, data) {
		let doc_to_write = null;
		if (!isAppend) {										// creating NEW doc
			doc_to_write = {
				_id: req.body.tx_id,							// during a create the id is in the body
				channel: data.channel,
				distribution_responses: [],						// populated later
				orderers: data.orderers,
				orgs2sign: data.orgs2sign,
				originator_msp: data.originator_msp,
				visibility: ev.STR.TX_INBOX,
				status: ev.STR.SIG_OPEN,						// status will be "open" or "closed"
				tx_type: data.ccd ? ev.STR.TX_CCD : ev.STR.TX_CHANNEL,
				type: ev.STR.SIG_COLLECTION,
				timestamp: Date.now(),

				// [channel fields]
				consenters: data.consenters,
				current_policy: {
					number_of_signatures:
						(data.current_policy && !isNaN(data.current_policy.number_of_signatures)) ? Number(data.current_policy.number_of_signatures) : 0,
				},
				json_diff: data.json_diff,
				orderers2sign: data.orderers2sign,
				proposal: data.proposal || null,
				reference_component_ids: data.reference_component_ids,	// array of str, add id of raft node that is being added as consenter

				// [ccd fields]
				ccd: data.ccd,
			};
		} else {												// appending to EXISTING doc
			doc_to_write = JSON.parse(JSON.stringify(data));	// copy it all
			if (req.body.status) {
				doc_to_write.status = req.body.status;			// if set, copy. validator already verified value
			}
			if (req.body.visibility) {
				doc_to_write.visibility = req.body.visibility;	// if set, copy.  validator already verified value
			}
			// new signatures are merged later
		}
		return t.misc.sortKeys(doc_to_write);
	}

	// -----------------------------------
	// Verify signature from signing cert - returns array of errors
	// -----------------------------------
	/* opts = {
		msp_id: "",										// only used for logs
		config_signature_b64: "",						// [required]
		proposal_b64: "",								// [required] but could be anything
		rootCerts_b64: ["ca root cert here as b64"],	// [required]
	}*/
	// step 1 - check if "config_signature_b64" on proposal validates against provided certificate
	// step 2 - check if the signing cert is vouched for by someone in "rootCerts_b64"
	function verifySignature(opts) {
		const errors = [];
		if (!opts.config_signature_b64) {			// i don't think this condition is currently possible
			logger.error('[signature] there is no signature to validate for msp_id:', opts.msp_id);					// basic input validation
			errors.push('signature cannot be validated. no signature provided for msp_id: ' + opts.msp_id);
		}
		if (!opts.proposal_b64) {
			logger.error('[signature] there is no proposal to validate against. msp_id:', opts.msp_id);				// basic input validation
			errors.push('signature cannot be validated. "proposal" was not found. msp_id: ' + opts.msp_id);
		}
		if (!t.misc.is_populated_array(opts.rootCerts_b64)) {
			logger.error('[signature] there are no known root certs to validate for msp_id:', opts.msp_id);			// basic input validation
			errors.push('signature cannot be validated. no known root certs for msp_id: ' + opts.msp_id);
		}

		if (errors.length > 0) {
			return errors;
		}

		//----------------------------------------//
		// ------ step 1 - check signature ------ //
		//----------------------------------------//
		const parsed_config_signature = parse_config_signature(opts.config_signature_b64);
		if (!parsed_config_signature || !parsed_config_signature.signing_cert_pem) {
			logger.error('[signature]', opts.msp_id, 'unable to parse ConfigSignature');
			return ['proposal\'s signature is malformed for msp_id: ' + opts.msp_id];
		} else if (!valid_proposal_sig(parsed_config_signature)) {
			logger.error('[signature]', opts.msp_id, 'signature on proposal hash did not validate with provided certificate');
			return ['proposal\'s signature is invalid for msp_id: ' + opts.msp_id];
		} else {
			logger.info('[signature] msp_id\'s signature on proposal hash is valid', opts.msp_id, 'step:[1/2]');

			//--------------------------------------------//
			// ------ step 2 - check w/ root certs ------ //
			//--------------------------------------------//
			if (ev.TRUST_UNKNOWN_CERTS === true) {
				logger.info('[signature] skipping certificate validation b/c the "trust_unknown_certs" setting is true');
				return [];															// who cares
			} else {
				logger.debug('[signature] checking provided cert against', opts.rootCerts_b64.length, 'root certs for msp_id:', opts.msp_id);
				const options = {
					certificate_b64: t.misc.b64(parsed_config_signature.signing_cert_pem),
					root_certs_b64: opts.rootCerts_b64,
					debug_tag: 'msp_id: ' + opts.msp_id
				};
				if (t.misc.is_trusted_certificate(options)) {
					logger.info('[validate cert] sig collection signature certificate validated with a root cert - step:[2/2]');
					return [];														// its good, let it be known
				} else {
					logger.error('[signature] no root certs signed the provided cert for', opts.msp_id, 'signature is not trusted');
					return ['signature is not trusted. no root certs signed the provided cert for msp_id: ' + opts.msp_id];
				}
			}
		}

		// unpack the ConfigSignature protobuf - signature is inside the config_signature object
		function parse_config_signature(config_signature_b64) {
			try {
				const config_signature_bin = t.misc.decodeb64Bin(config_signature_b64);				// base 64 decode signature first
				const ConfigSignature = t.protobufjs.lookupType('common.ConfigSignature');			// decode fabric pb ConfigSignature
				let msg = ConfigSignature.decode(config_signature_bin);
				const config_signature_obj = ConfigSignature.toObject(msg, { defaults: false });

				const SignatureHeader = t.protobufjs.lookupType('common.SignatureHeader');			// decode fabric pb SignatureHeader
				msg = SignatureHeader.decode(config_signature_obj.signatureHeader);
				const signature_header_obj = SignatureHeader.toObject(msg, { defaults: false });

				const SerializedIdentity = t.protobufjs.lookupType('msp.SerializedIdentity');		// decode fabric pb SerializedIdentity
				msg = SerializedIdentity.decode(signature_header_obj.creator);
				const serialized_identity_obj = SerializedIdentity.toObject(msg, { defaults: false });

				return {
					signing_cert_pem: t.misc.binToStr(serialized_identity_obj.idBytes),
					signature: config_signature_obj.signature,
					signature_header_bin: config_signature_obj.signatureHeader,
				};
			} catch (e) {
				logger.error('[signature] error parsing ConfigSignature:', e);
				return null;
			}
		}

		// return true if the proposal was actually signed by the certificate provided
		function valid_proposal_sig(parsed_con_sig) {
			let valid = false;
			try {
				const pubKeyObj = t.KEYUTIL.getKey(parsed_con_sig.signing_cert_pem);
				const pubKeyUtility = t._ecdsa.keyFromPublic(pubKeyObj.pubKeyHex, 'hex');
				const proposal_bin = t.misc.decodeb64Bin(opts.proposal_b64);						// base 64 decode proposal first
				const data2sign_bin = new Uint8Array(proposal_bin.length + parsed_con_sig.signature_header_bin.length);
				data2sign_bin.set(parsed_con_sig.signature_header_bin);
				data2sign_bin.set(proposal_bin, parsed_con_sig.signature_header_bin.length);

				const hash_of_proposal = t.crypto.createHash('sha256').update(data2sign_bin).digest().toString('hex');
				logger.silly('[signature] checking signature on hash:', hash_of_proposal.length, hash_of_proposal);

				valid = pubKeyUtility.verify(hash_of_proposal, parsed_con_sig.signature);			// verify signature against hash
			} catch (e) {
				logger.error('[signature] thrown error when checking proposal signature', e);
			}
			return valid;
		}
	}

	// prepare for sending the request to other athenas
	function handle_each_distribution(opts, cb) {
		const errors = [];
		const successes = [];
		const redistribute_body = JSON.parse(JSON.stringify(opts.body));	// clone since we will change the "distribute" field

		// build the list of orgs to redistribute to based on the request body
		const distribution_urls_obj = exports.build_destinations(redistribute_body, opts.sig_collection_doc);

		redistribute_body.distribute = 'none';								// change the distribute property to none to avoid a loop
		t.async.eachOfLimit(distribution_urls_obj, 8, (org, key, cb_redistribute) => {
			logger.debug('[signature collection] distributing to org:', org.msp_id);
			const base_url = t.misc.format_url(org.optools_url);
			const options = {
				method: opts.method,
				baseUrl: base_url,
				url: '/signature_collections' + (opts.isAppend ? ('/' + opts.tx_id) : ''),	// do not add "/api/v2" here, done automatically by route check
				org: org,
				body: redistribute_body,
				authorize_header: opts.authorize_header,
			};
			distribute_req_wrap(options, (err_redistribute) => {
				if (err_redistribute) {
					logger.error('[signature collection] distribution attempt 1 error:', org.msp_id, JSON.stringify(err_redistribute));
					if (t.ot_misc.get_code(err_redistribute) === 400) {	// if this is a post and fails for bad input, then we want to retry it
						try_again(org, options, () => {
							return cb_redistribute();
						});
					} else {											// if some other error, just store it
						errors.push({
							msp_id: org.msp_id,
							optools_url: base_url,
							resp: err_redistribute,
						});
					}
				} else {
					logger.info('[signature collection] distribution attempt 1 success.', org.msp_id);
					successes.push({									// success
						msp_id: org.msp_id,
						optools_url: base_url,
						message: 'ok',
						timestamp: Date.now(),
					});
				}
				return cb_redistribute();
			});
		}, () => {
			return cb({ errors: errors, successes: successes, destinations: Object.keys(distribution_urls_obj) });
		});

		// try request again as a PUT
		function try_again(org, last_options, cb_try_again) {
			last_options.method = 'PUT';
			last_options.url = '/signature_collections/' + opts.tx_id;
			distribute_req_wrap(last_options, (err_redistribute_2, resp_redistribute_2) => {
				if (err_redistribute_2) {
					logger.error('[signature collection] distribution attempt 2 error:', org.msp_id, JSON.stringify(err_redistribute_2));
					errors.push({
						msp_id: org.msp_id,
						optools_url: org.optools_url,
						resp: err_redistribute_2,
					});
				} else {
					logger.info('[signature collection] distribution attempt 2 success.', org.msp_id);
					successes.push({
						msp_id: org.msp_id,
						optools_url: org.optools_url,
						message: 'ok',
						timestamp: Date.now(),
					});
				}
				return cb_try_again();
			});
		}
	}

	// first decide what path to use (/v1/ or /v2/) for the distribute call by calling the OpTools with an OPTIONS request
	// then call the distribute http request w/the right path
	function distribute_req_wrap(orig_opts, cb) {
		const base_url = t.misc.format_url(orig_opts.baseUrl);						// parse for protocol + hostname + port (no path)
		logger.debug('[sig route check] checking distribute route availability on:', base_url);

		const availability_opts = {
			method: 'OPTIONS',
			baseUrl: base_url,
			url: t.misc.url_join(['/api/v2', orig_opts.url]),		// the version in this route doesn't matter, all versions go to the same place
			headers: {
				'Accept': 'application/json',
			},
			timeout: (orig_opts.org && !isNaN(orig_opts.org.timeout_ms)) ? orig_opts.org.timeout_ms : 15000,
			_name: 'sig route check',
		};
		t.misc.retry_req(availability_opts, (error, resp) => {
			const v1_route = t.misc.url_join(['/api/v1', orig_opts.url]);			// append the v1 route
			const v2_route = t.misc.url_join(['/api/v2', orig_opts.url]);			// append the v2 route
			orig_opts.url = v1_route;												// default to using the v1 route

			if (error || t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {		// error, use default
				logger.warn('[sig route check] route availability error, defaulting to /v1/');
			} else {																// success, pick route from response
				const response = t.ot_misc.formatResponse(resp);
				if (response && response.methods && orig_opts.method) {
					const orig_method_lc = orig_opts.method.toLowerCase();
					if (response.methods[orig_method_lc] && response.methods[orig_method_lc].routes && response.methods[orig_method_lc].routes.includes('v2')) {
						logger.debug('[sig route check] route availability supports /v2/');
						orig_opts.url = v2_route;									// it supports v2
					} else {
						logger.debug('[sig route check] route availability supports /v1/');
						orig_opts.url = v1_route;									// it does not support v2, use v1
					}
				}
			}

			orig_opts.baseUrl = base_url;											// replace in original options
			http_distribute_req(orig_opts, (err, resp) => {							// now do the http request w/the modified options... whew
				return cb(err, resp);
			});
		});
	}

	// send the new or updated signature collection to other athenas
	function http_distribute_req(opts, cb) {
		logger.debug('[signature collection] distributing w/base:', opts.baseUrl);
		logger.debug('[signature collection] distributing w/route:', opts.url);
		logger.debug('[signature collection] distributing w/header:', opts.authorize_header);
		const options = {
			method: opts.method,
			baseUrl: opts.baseUrl,
			url: opts.url,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Authorization': opts.authorize_header
			},
			timeout: (opts.org && !isNaN(opts.org.timeout_ms)) ? opts.org.timeout_ms : 15000,
			body: JSON.stringify(opts.body),
			_name: 'signature collection',
		};
		t.misc.retry_req(options, (error, resp) => {
			if (t.ot_misc.is_error_code(t.ot_misc.get_code(resp))) {
				const ret = t.ot_misc.formatResponse(resp);
				delete ret.distribution_responses;
				if (ret.errors) {				// if we have a proper error message, use it instead of "message"
					delete ret.message;
				}
				return cb(ret, opts.org);
			} else if (error) {
				return cb({ statusCode: 500, errors: [{ details: error }] }, null);
			} else {
				return cb(null, t.ot_misc.formatResponse(resp));
			}
		});
	}

	// build the list of orgs to redistribute to based on the request body
	// - don't distribute to self (same athena)
	// - default "distribute" = "missing"
	// - if distribute === "missing" don't distribute to orgs that already have signatures
	exports.build_destinations = (incoming_body, sig_collection_doc) => {
		const url_of_self = t.misc.format_url(ev.HOST_URL);
		let distribution_urls_obj = {};										// use object to avoid duplicates
		let all_orgs_obj = {};

		if (!incoming_body) {
			incoming_body = {};
		}
		if (!incoming_body.distribute) {
			incoming_body.distribute = 'missing';
		}
		incoming_body.distribute = incoming_body.distribute.toLowerCase();

		// aggregate orgs to 1 object
		if (sig_collection_doc) {		// if we have a doc, copy values to all_orgs_obj
			all_orgs_obj = copy2all(all_orgs_obj, sig_collection_doc.orderers2sign);
			all_orgs_obj = copy2all(all_orgs_obj, sig_collection_doc.orgs2sign);
		}
		if (incoming_body) {			// if we have new signatures, marry them values in all_orgs_obj
			all_orgs_obj = copy2all(all_orgs_obj, incoming_body.orderers2sign);
			all_orgs_obj = copy2all(all_orgs_obj, incoming_body.orgs2sign);
		}
		logger.debug('[signature collection] there are', Object.keys(all_orgs_obj).length, 'possible org(s) to distribute to');

		if (Array.isArray(incoming_body.distribute)) {					// if an array of athena urls was provided, use them
			const urls_array = JSON.parse(JSON.stringify(incoming_body.distribute));
			logger.debug('[signature collection] a custom distribution list was passed in:', urls_array.length);
			for (let i in urls_array) {
				if (urls_array[i].optools_url && urls_array[i].msp_id) {
					const fmt_url = t.misc.format_url(urls_array[i].optools_url);
					if (fmt_url !== url_of_self) {						// skip self
						distribution_urls_obj[fmt_url] = { msp_id: urls_array[i].msp_id };
					}
				}
			}
		} else {
			for (let key in all_orgs_obj) {								// else lets build the list of athenas
				const org = all_orgs_obj[key];
				if ((incoming_body.distribute === 'missing' && !org.signature) || incoming_body.distribute === 'all') {
					const fmt_url = t.misc.format_url(org.optools_url);
					if (fmt_url !== url_of_self) {						// skip self
						distribution_urls_obj[fmt_url] = org;
					} else {
						logger.debug('[signature collection] no need to distribute to self. skipping distribution to optools:', org.optools_url);
					}
				}
			}
		}

		logger.debug('[signature collection] will distribute to', Object.keys(distribution_urls_obj).length, 'org(s)');
		return distribution_urls_obj;

		// add new array to all obj
		function copy2all(all_obj, new_arr) {
			if (t.misc.is_populated_array(new_arr)) {
				for (let i in new_arr) {
					const id = new_arr[i].msp_id + '~' + new_arr[i].optools_url;
					if (!all_obj[id]) {
						all_obj[id] = new_arr[i];			// id doesn't exist yet, store it
					} else {
						if (new_arr[i].signature) {			// id exist already && signature present -> copy signature
							all_obj[id].signature = new_arr[i].signature;
						}
						if (new_arr[i].timeout_ms) {		// id exist already && timeout present -> copy timeout
							all_obj[id].timeout_ms = new_arr[i].timeout_ms;
						}
					}
				}
			}
			return all_obj;
		}
	};

	//--------------------------------------------------
	// Delete signature collection
	//--------------------------------------------------
	exports.deleteSignatureCollection = (req, cb) => {
		logger.info('[signature collection] attempting to delete a signature collection:', req.params.tx_id);

		let redistribute_body = JSON.parse(JSON.stringify(req.body));	// clone since we will change the "distribute" field
		if (!redistribute_body) {
			redistribute_body = {};
		}
		if (!redistribute_body.distribute) {
			redistribute_body.distribute = 'all';						// default to distribute the delete to all
		}

		// overwrite "distribute" if a local auth was used
		const parsed_auth = t.auth_header_lib.parse_auth(req);
		if (parsed_auth && parsed_auth.type !== ev.STR.SIG) {
			logger.warn('[signature collection] overwriting "distribute" to "none" since a local auth was used to delete a sig collection:', parsed_auth.type);
			redistribute_body.distribute = 'none';
		}

		// create a notification
		const notice = { message: 'deleting a signature collection. tx_id: ' + req.params.tx_id };
		t.notifications.procrastinate(req, notice);

		// ----- Get the doc first ----- //
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: req.params.tx_id,
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (err_getSigCollection, sig_collection_doc) => {
			if (err_getSigCollection) {
				const error_code = t.ot_misc.get_code(err_getSigCollection);
				if (error_code === 404) {
					logger.warn('[signature collection] sig doc (to delete) does not exist:', error_code);
					return cb({ statusCode: error_code, msg: 'signature collection by this id does not exist. id: "' + req.params.tx_id + '"' });
				} else {
					logger.error('[signature collection] error trying to find sig doc to delete it:', error_code, err_getSigCollection);
					return cb({ statusCode: error_code, msg: 'problem getting the signature collection for deletion. id: "' + req.params.tx_id + '"' });
				}
			} else {

				// ----- Distribute the delete request to other athenas ----- //
				const distribution_urls_obj = exports.build_destinations(redistribute_body, sig_collection_doc);
				redistribute_body.distribute = 'none';								// change the distribute property to none to avoid a loop
				t.async.eachOfLimit(distribution_urls_obj, 8, (org, key, cb_redistribute) => {
					logger.debug('[signature collection] distributing delete to org:', org.msp_id);
					const options = {
						method: 'DELETE',

						// if "/api/vx" is in here, it will be replaced during route check, ignore it
						baseUrl: org.optools_url,

						// do not add "/api/v2" here, done automatically by route check
						url: '/signature_collections/' + req.params.tx_id,
						org: org,
						body: redistribute_body,
						authorize_header: req.authorize_header,
					};
					distribute_req_wrap(options, (err_redistribute, body) => {
						if (err_redistribute) {
							logger.warn('[signature collection] delete distribution error:', org.msp_id, JSON.stringify(err_redistribute));
						} else {
							logger.info('[signature collection] delete distribution success.', org.msp_id, JSON.stringify(body));
						}
						return cb_redistribute();			// never pass an error back
					});
				}, () => {
					local_delete_doc((err, resp) => {
						return cb(err, resp);
					});
				});
			}
		});

		// delete the local sig collection doc in our db
		function local_delete_doc(loc_cb) {
			const delete_opts = {
				_id: req.params.tx_id,
				db_name: ev.DB_COMPONENTS
			};
			t.otcc.repeatDelete(delete_opts, 1, (err, resp) => {
				if (err) {
					const code = t.ot_misc.get_code(err);
					if (code === 404) {
						logger.warn('[signature collection] delete error, doc does not exist:', code, err);
						const ret = {
							message: 'id no longer exists. already deleted?',
							id: delete_opts._id
						};
						return loc_cb(null, ret);
					} else {
						logger.error('[signature collection] delete error with signature collection:', code, err);
						return loc_cb(err, null);
					}
				} else {
					logger.info('[signature collection] deleting local signature collection doc - success');
					const ret = {
						message: 'ok',
						tx_id: resp.id,
						details: 'removed'
					};
					return loc_cb(null, ret);
				}
			});
		}
	};

	//--------------------------------------------------
	// Get msp's certificate functions
	//--------------------------------------------------
	exports.getMspsCertificate = (req, cb) => {
		logger.info(`getting certificate for ${req.params.msp_id}`);

		const opts = {
			db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
			_id: '_design/athena-v1',		// name of design doc
			view: '_doc_types',
			SKIP_CACHE: t.ot_misc.skip_cache(req),
			query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.MSP, ev.STR.MSP_EXTERNAL] }),
		};
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error(`Problem getting msp doc ${req.params.msp_id}: ${JSON.stringify(err)}`);
				cb(err);
			} else {
				const msp_docs = [];
				if (resp) {
					for (let i in resp.rows) {
						if (resp.rows[i] && resp.rows[i].doc) {
							const doc = resp.rows[i].doc;
							if (doc.msp_id === req.params.msp_id) {			// find those that match the msp
								msp_docs.push({
									msp_id: doc.msp_id,
									name: doc.name,
									root_certs: doc.root_certs,
									admins: doc.admins,
									tls_root_certs: doc.tls_root_certs,
									intermediate_certs: doc.intermediate_certs,
								});
							}
						}
					}
				}

				if (msp_docs.length === 0) {
					const err = {
						statusCode: 400,
						msg: `MSP ${req.params.msp_id} not found`
					};
					return cb(err);
				} else {
					return cb(null, { msps: msp_docs });
				}
			}
		});
	};

	//--------------------------------------------------
	// Functions for register external athenas
	//--------------------------------------------------
	exports.registerExternalAthenas = (req, cb) => {
		const details = [];

		// create a notification
		const notice = { message: 'imported external parties' };
		t.notifications.procrastinate(req, notice);

		// --- Get the external msp doc --- //
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: ev.STR.EXTERNAL_PARTIES_DOC,
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (error, external_party_doc) => {
			if (!external_party_doc) {						// if it doesn't exist, we don't care
				external_party_doc = {
					_id: ev.STR.EXTERNAL_PARTIES_DOC,
					type: 'external_parties',
					parties: {},
				};
			}

			const wr_opts = {								// gather properties that we need to write the doc
				db_name: ev.DB_COMPONENTS,
				doc: external_party_doc
			};
			t.otcc.repeatWriteSafe(wr_opts, (externalMspDoc) => {
				for (let i in req.body.parties) {
					const msp_id = req.body.parties[i].msp_id;
					const cert = req.body.parties[i].certificate;
					const pos = find_cert_pos(cert, externalMspDoc.parties[msp_id]);

					if (pos >= 0) {
						externalMspDoc.parties[msp_id][pos] = {
							timestamp: Date.now(),
							optools_url: req.body.parties[i].optools_url,
							certificate: req.body.parties[i].certificate,
							timeout_ms: req.body.parties[i].timeout_ms,				// [optional]
						};
						details.push('updated cert in position: ' + i + ' for msp id: ' + msp_id);
					} else {
						if (!externalMspDoc.parties[msp_id]) {
							externalMspDoc.parties[msp_id] = [];
						}			// init
						externalMspDoc.parties[msp_id].push({
							timestamp: Date.now(),
							optools_url: req.body.parties[i].optools_url,
							certificate: req.body.parties[i].certificate,
							timeout_ms: req.body.parties[i].timeout_ms,				// [optional]
						});
						details.push('added cert in position: ' + i + ' for msp id: ' + msp_id);
					}
				}
				return { doc: externalMspDoc };
			}, (err_writeDoc) => {
				if (err_writeDoc) {
					logger.error('[signature collection] updating external parties - failure', err_writeDoc);
					return cb({ statusCode: 500, msg: 'could not update external parties doc' });
				} else {
					logger.info('[signature collection] updating external parties - success');
					return cb(null, { message: 'ok', details: details });
				}
			});
		});
	};

	// check if cert exists already or not in object
	function find_cert_pos(cert, msp_arr) {
		if (msp_arr && Array.isArray(msp_arr)) {
			for (const i in msp_arr) {
				if (msp_arr[i].certificate === cert) {
					return i;
				}
			}
		}
		return -1;
	}

	// get all internal msp data as well as external party data
	exports.getAllPartyData = (cb) => {
		t.async.parallel([

			// --- get the external doc of parties [0] --- //
			function (join) {
				const get_opts = {
					db_name: ev.DB_COMPONENTS,
					_id: ev.STR.EXTERNAL_PARTIES_DOC,
					SKIP_CACHE: true
				};
				t.otcc.getDoc(get_opts, (error, externalMspDoc) => {
					if (error) {										// error getting doc
						logger.warn('could not get the external party doc', get_opts._id, '(this is okay, might not exist yet)');
						if (t.ot_misc.get_code(error) === 404) {
							// go ahead and make the doc so we don't see this error next time
							const doc = {
								_id: ev.STR.EXTERNAL_PARTIES_DOC,
								type: 'external_parties',
								parties: {},
							};
							t.otcc.writeDoc({ db_name: ev.DB_COMPONENTS }, doc, (_) => {
								// don't wait for this to happen, its just for book keeping
							});
						}
						join(null);
					} else {
						join(null, externalMspDoc);
					}
				});
			},

			// --- get the internal msps [1] --- //
			function (join) {
				const opts = {
					db_name: ev.DB_COMPONENTS,		// db for peers/cas/orderers/msps/etc docs
					_id: '_design/athena-v1',		// name of design doc
					view: '_doc_types',
					SKIP_CACHE: true,
					query: t.misc.formatObjAsQueryParams({ include_docs: true, keys: [ev.STR.MSP, ev.STR.MSP_EXTERNAL] }),
				};
				t.otcc.getDesignDocView(opts, (err, resp) => {
					if (err) {
						join(null);
					} else {
						const msp_docs = [];
						if (resp) {
							for (let i in resp.rows) {
								if (resp.rows[i] && resp.rows[i].doc) {
									msp_docs.push(resp.rows[i].doc);
								}
							}
						}
						join(null, msp_docs);
					}
				});
			}
		], function (_, results) {
			const external_doc = results[0];
			const local_msps = results[1];
			const all_msps = {};

			if (external_doc) {												// now merge external docs into all_msps
				for (let msp_id in external_doc.parties) {
					if (!all_msps[msp_id]) {
						all_msps[msp_id] = [];								// init
					}
					all_msps[msp_id] = all_msps[msp_id].concat(external_doc.parties[msp_id]);		// add objects in array
				}
			}

			if (local_msps) {												// and finally merge local msps into all_msps
				for (let i in local_msps) {
					const msp_id = local_msps[i].msp_id;
					if (!all_msps[msp_id]) {
						all_msps[msp_id] = [];								// init
					}

					for (let x in local_msps[i].root_certs) {				// add certs in "root_certs" array
						if (local_msps[i].root_certs[x]) {
							all_msps[msp_id].push(build_cert_entry(local_msps[i], local_msps[i].root_certs[x]));
						}
					}
					for (let x in local_msps[i].intermediate_certs) {		// add certs in "intermediate_certs" array
						if (local_msps[i].intermediate_certs[x]) {
							all_msps[msp_id].push(build_cert_entry(local_msps[i], local_msps[i].intermediate_certs[x]));
						}
					}
				}
			}

			logger.debug('found', Object.keys(all_msps).length, 'certificates to validate against');
			return cb(null, { parties: all_msps });
		});

		function build_cert_entry(mspObj, cert) {
			return {
				timestamp: mspObj.timestamp,
				optools_url: mspObj.host_url || ev.HOST_URL + '/api/v1',
				certificate: cert,						// base 64 encoded pem cert
				display_name: mspObj.display_name || mspObj.name,
				type: mspObj.type						// internal vs external
			};
		}
	};

	// build format for response
	exports.buildListMspResponse = (resp) => {
		const parties = [];
		for (const msp in resp.parties) {
			for (const i in resp.parties[msp]) {
				const entry = resp.parties[msp][i];
				const obj = {
					msp_id: msp,
					optools_url: entry.optools_url,
					certificate: entry.certificate,
					timeout_ms: entry.timeout_ms,
				};
				parties.push(obj);
			}
		}
		return { parties: parties };
	};

	// remove parties in body - array
	exports.removeExternalAthenas = (req, cb) => {
		const custom_response = {
			message: 'ok',
			details: []
		};

		// gather the properties that we need to read and write the doc
		const wr_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: ev.STR.EXTERNAL_PARTIES_DOC,
		};
		t.otcc.repeatWriteSafe(wr_opts, (external_doc) => {

			for (const i in req.body.parties) {
				if (req.body.parties[i] && req.body.parties[i].msp_id && req.body.parties[i].certificate) {
					const msp_id = req.body.parties[i].msp_id;
					const cert = req.body.parties[i].certificate;

					const keep_these = [];												// reset this on each msp loop
					if (msp_id && external_doc.parties[msp_id]) {
						for (let x in external_doc.parties[msp_id]) {
							if (external_doc.parties[msp_id][x].certificate === cert) {	// look it up by the cert
								custom_response.details.push(`removed cert under msp id "${msp_id}"`);
							} else {
								keep_these.push(external_doc.parties[msp_id][x]);
							}
						}
						external_doc.parties[msp_id] = keep_these;							// overwrite to remove the desired certs
					}
				}
			}
			return { doc: external_doc };
		}, (err_repeatWriteSafe) => {
			custom_response.statusCode = err_repeatWriteSafe ? 500 : 200;
			return cb(err_repeatWriteSafe, custom_response);
		});
	};

	// get all the msp's certs
	exports.getCertsForMspId = (all_party_data, msp_id) => {
		const ret = [];
		if (all_party_data && all_party_data.parties) {
			for (let i in all_party_data.parties[msp_id]) {
				if (all_party_data.parties[msp_id][i] && all_party_data.parties[msp_id][i].certificate) {
					ret.push(all_party_data.parties[msp_id][i].certificate);
				}
			}
		}
		return ret;
	};

	//--------------------------------------------------
	// Check the authorization header for signature collection apis - middleware
	//--------------------------------------------------
	// step 1 - check if signature in "authorization" header on body validates with body.authorize.certificate
	// step 2 - check if the body.authorize.certificate is vouched for by any ca root_certs
	exports.validateApiSignature = (req, res, next) => {
		const lc_headers = {};											// make a copy of all headers in lowercase
		for (let i in req.headers) {
			lc_headers[i.toLowerCase()] = req.headers[i];
		}
		if (!lc_headers.authorization || lc_headers.authorization.indexOf('Signature ') === -1) {
			logger.error('[auth sig collection] could not find "Signature " in authorization header');
			return send_unauthorized('unauthorized - missing or malformed authorization header');
		} else if (!req.body.authorize || !req.body.authorize.certificate) {
			logger.error('[auth sig collection] could not find "authorize.certificate" in request body');
			return send_unauthorized('unauthorized - missing or malformed "authorize.certificate" pem field in body');
		} else {
			req.authorize_header = lc_headers.authorization;			// store for use later

			// Step 0
			// --- Load all MSP Data --- //
			exports.getAllPartyData((err_get, allPartyData) => {
				if (err_get) {
					logger.error('[auth sig collection] problem getting party data', err_get);
					const ret = {
						statusCode: 500,
						msg: 'problem getting root certs to validate signature',
					};
					return res.status(500).json(ret);
				} else {
					let authorize_certificate_pem = t.misc.decodeb64(req.body.authorize.certificate);
					const msp_id = req.body.authorize.msp_id;
					let valid = false;
					const signature_b64 = lc_headers.authorization ? lc_headers.authorization.substring(10) : '';	// get value after "Signature "

					// Step 1 - test signature against data in body
					try {
						const hash = exports.build_sig_collection_hash(req.body);
						authorize_certificate_pem = t.misc.decodeb64(req.body.authorize.certificate);
						const pubKeyObj = t.KEYUTIL.getKey(authorize_certificate_pem);
						const pubKeyUtility = t._ecdsa.keyFromPublic(pubKeyObj.pubKeyHex, 'hex');
						logger.silly('[auth sig collection] checking scs against hash:', hash.length, hash);	// scs = sign collection signature
						valid = pubKeyUtility.verify(hash, t.misc.decodeb64Bin(signature_b64));					// check hash against signature
					} catch (e) {
						logger.error('[auth sig collection] thrown error when checking scs', e);
						return send_unauthorized('unauthorized - malformed signature (scs)');
					}

					if (!valid) {
						logger.warn('[auth sig collection] invalid signature in header:', signature_b64);
						return send_unauthorized('unauthorized - invalid signature (scs)');
					} else {
						logger.info('[auth sig collection] scs on hash is valid. step:[1/2]', msp_id);

						// Step 2 - test certificate against trusted certs
						const options = {
							certificate_b64: req.body.authorize.certificate,
							root_certs_b64: exports.getCertsForMspId(allPartyData, msp_id),
							debug_tag: 'sig collection signature',
						};
						if (!msp_id) {
							logger.error('[auth sig collection] field "msp_id" is missing from "authorize". will be unable to verify signature.');
						}
						if (!t.misc.is_trusted_certificate(options)) {
							logger.error('[auth sig collection] cert that created scs is not trusted by any known root certs. sig not trusted. msp:', msp_id);
							logger.debug('[auth sig collection] number of trusted certs for msp:', options.root_certs_b64.length, 'msp:', msp_id);
							return send_unauthorized('unauthorized - untrusted signature (scs)');
						} else {
							logger.info('[validate cert] sig collection signature certificate validated with a root cert - step:[2/2]');
							return next();										// its good, let it be known
						}
					}
				}
			});
		}

		// send a 401 response
		function send_unauthorized(error_message_str) {
			const ret = {
				statusCode: 401,
				msg: error_message_str,
			};
			return res.status(401).json(ret);
		}
	};

	//-------------------------------------------------------------
	// Build a signature collection signature header - used to authorize into these apis
	//-------------------------------------------------------------
	exports.build_sig_collection_auth_header = (body, id_prv_key_pem_b64) => {
		return 'Signature ' + exports.build_sig_collection_signature(body, id_prv_key_pem_b64);
	};

	//-------------------------------------------------------------
	// Build a signature collection signature - used to authorize into these apis
	//-------------------------------------------------------------
	exports.build_sig_collection_signature = (body, id_prv_key_pem_b64) => {
		const id_prv_key_pem = t.misc.decodeb64(id_prv_key_pem_b64);
		const hash = exports.build_sig_collection_hash(body);
		logger.debug('[sig collection] built hash for api', hash);
		const prvKeyObj = t.KEYUTIL.getKey(id_prv_key_pem);
		const signKey = t._ecdsa.keyFromPrivate(prvKeyObj.prvKeyHex, 'hex');
		let sig = t._ecdsa.sign(hash, signKey);
		sig = sig.toDER();
		return t.misc.b64(sig);
	};

	//-------------------------------------------------------------
	// Build a signature collection hash - used to validate auth on incoming requests to athena
	//-------------------------------------------------------------
	exports.build_sig_collection_hash = (body) => {
		let minimal = null;
		if (body.authorize && body.authorize.hash_ver === 'v2') {	// newer hash function, more future proof
			minimal = JSON.parse(JSON.stringify(body));
			delete minimal.distribute;								// hash over fields that should not change between the request in and redistribute out
		} else {
			minimal = {												// hash over fields that should not change between the request in and redistribute out
				tx_id: body.tx_id,
				proposal: body.proposal,
				channel: body.channel,
				orderers: body.orderers,
				orgs2sign: body.orgs2sign,
				orderers2sign: body.orderers2sign,
				authorize: body.authorize,
				originator_msp: body.originator_msp,
				json_diff: {},
				current_policy: body.current_policy,
				status: body.status,
			};
		}
		minimal = t.misc.sortKeys(minimal);
		return t.crypto.createHash('sha256').update(JSON.stringify(minimal), 'utf8').digest().toString('hex');
	};

	//-------------------------------------------------------------
	// Change the visibility of multiple signature collection txs
	//-------------------------------------------------------------
	exports.editSignatureCollectionVisibilities = (req, cb) => {
		if (!req.body.tx_ids || !Array.isArray(req.body.tx_ids)) {
			logger.error('[edit sig collection] missing "tx_ids" field');
			return cb({ statusCode: 400, msg: 'missing array of transaction ids: "tx_ids"' });
		} else if (!req.body.visibility) {
			logger.error('[edit sig collection] missing "visibility" field');
			return cb({ statusCode: 400, msg: 'missing field "visibility"' });
		} else if (req.body.visibility !== ev.STR.TX_ARCHIVE && req.body.visibility !== ev.STR.TX_INBOX) {
			logger.error('[edit sig collection] missing "visibility" field');
			return cb({ statusCode: 400, msg: 'incorrect value for "visibility". try "' + ev.STR.TX_INBOX + '" or "' + ev.STR.TX_ARCHIVE + '".' });
		} else {
			getBulkSignatureCollectionsDocs(req.body.tx_ids, (error, couch_resp) => {	// get all the docs first
				if (error) {
					return cb(error);
				} else {
					const bulk_docs = { docs: [] };
					for (let i in couch_resp) {
						const doc = couch_resp[i];
						if (doc.visibility === req.body.visibility) {					// if the field is not changing skip it
							logger.warn('[edit sig collection] "visibility" of this sig collection is not changing. will not edit tx:', doc._id);
						} else {
							doc.visibility = req.body.visibility;
							bulk_docs.docs.push(t.misc.sortKeys(doc));
						}
					}

					if (bulk_docs.docs.length === 0) {
						logger.warn('[edit sig collection] 0 sig docs to edit');
						return cb(null, { message: 'ok', edited: 0 });					// I guess this is still a success
					} else {
						t.couch_lib.bulkDatabase({ db_name: ev.DB_COMPONENTS }, bulk_docs, (err, resp) => {	// perform the edit
							if (err != null) {
								logger.error('[edit sig collection] could not edit sig collection docs', err, resp);
								return cb({ statusCode: 500, msg: 'unable to edit sig collection tx. check logs.' });
							} else {
								logger.debug('[edit sig collection] edited docs ' + bulk_docs.docs.length);
								return cb(null, { message: 'ok', edited: bulk_docs.docs.length });	// johnny, tell them what they won
							}
						});
					}
				}
			});
		}

		// get a bunch of sig collection docs by their tx_ids
		function getBulkSignatureCollectionsDocs(tx_ids, cb) {
			const opts = {
				db_name: ev.DB_COMPONENTS,
				_id: '_all_docs',
				SKIP_CACHE: true,
				query: t.misc.formatObjAsQueryParams({
					keys: tx_ids,								// array of tx ids
					include_docs: true
				}),
			};
			t.otcc.getDoc(opts, (err, resp) => {
				if (err) {
					return cb(err);
				} else {
					const ret = [];
					if (resp) {
						for (let i in resp.rows) {				// make sure its an actual sig collection doc
							if (resp.rows[i].doc && resp.rows[i].doc.type === ev.STR.SIG_COLLECTION) {
								ret.push(resp.rows[i].doc);
							}
						}
					}
					return cb(null, ret);
				}
			});
		}
	};

	//--------------------------------------------------
	// Resend aka replay failed distribution txs in a signature collection doc
	//--------------------------------------------------
	/*
	req = {
		params: {
			tx_id: "" [required] will be used to identify the sig collection
		}
	}
	*/
	exports.resendFailedDistributionTxs = (req, cb_fromAPI) => {
		logger.info('[signature collection] attempting to resend a signature collection tx');
		const tx_id = req.params.tx_id;
		let resend_successes = 0;
		let resend_attempts = 0;
		let resend_errs = [];

		// 1. get tx doc
		get_sig_col_by_id(tx_id, (error, sig_doc) => {
			if (error) {
				// error already logged
				return cb_fromAPI(error);
			} else if (!sig_doc || !sig_doc.distribution_responses) {
				logger.error('[signature collection] cannot resend, missing sig doc data');
				const ret = {
					statusCode: 500,
					msg: 'cannot resend, missing sig doc data'
				};
				return cb_fromAPI(ret);
			} else {

				// iter over each tx in the doc
				t.async.eachOfLimit(sig_doc.distribution_responses, 1, (dist_obj, tx_pos, cb_sig_col) => {

					// iter over each distribution error in the tx (edit the sig doc as we go)
					const rebuild_distribution_errors = [];								// edit the doc by rebuilding each "errors" array in each tx
					t.async.eachOfLimit(dist_obj.errors, 1, (tx_err_obj, err_pos, cb_tx_errors) => {
						resend_attempts++;

						if (!sig_doc.distribution_responses[tx_pos]) {
							logger.error('[signature collection] cannot resend, missing everything in sig doc. pos:', tx_pos);
							rebuild_distribution_errors.push(tx_err_obj);				// keep the old error
							return cb_tx_errors();
						} else if (!dist_obj || !dist_obj._req || !dist_obj._req.auth_header || !dist_obj._req.body || !dist_obj._req.method) {
							logger.error('[signature collection] cannot resend, missing req details in sig doc. pos:', tx_pos, err_pos);
							rebuild_distribution_errors.push(tx_err_obj);				// keep the old error
							return cb_tx_errors();
						} else if (!tx_err_obj.optools_url) {
							logger.error('[signature collection] cannot resend, missing optools url. pos:', tx_pos, err_pos, JSON.stringify(tx_err_obj));
							rebuild_distribution_errors.push(tx_err_obj);				// keep the old error
							return cb_tx_errors();
						} else {

							// 2. distribute the new request to external athenas
							logger.debug('[signature collection] resending tx to org, pos:', tx_pos, err_pos, tx_err_obj.msp_id, tx_err_obj.optools_url);
							const options = {
								method: dist_obj._req.method,

								// if "/api/vx" is in here, it will be replaced during route check, ignore it
								baseUrl: tx_err_obj.optools_url,

								// do not add "/api/v2" here, done automatically by route check
								url: '/signature_collections/' + (dist_obj._req.method === 'PUT' ? ('/' + tx_id) : ''),
								org: {
									msp_id: tx_err_obj.msp_id,
									optools_url: tx_err_obj.optools_url,
								},
								body: dist_obj._req.body,
								authorize_header: dist_obj._req.auth_header,
							};
							distribute_req_wrap(options, (err_redistribute) => {
								if (err_redistribute) {
									logger.error('[signature collection] resend error:', tx_err_obj.msp_id, JSON.stringify(err_redistribute));
									rebuild_distribution_errors.push(tx_err_obj);		// keep the old error
									resend_errs.push({									// store this error for response to this api
										msp_id: tx_err_obj.msp_id,
										optools_url: tx_err_obj.optools_url,
										resp: err_redistribute,
									});
								} else {
									logger.info('[signature collection] resend success.', tx_err_obj.msp_id);
									resend_successes++;

									// do not keep the old error (so don't add it to the rebuild array)
									if (Array.isArray(sig_doc.distribution_responses[tx_pos].successes)) {
										sig_doc.distribution_responses[tx_pos].successes.push({		// add its success to the success array
											msp_id: tx_err_obj.msp_id,
											optools_url: tx_err_obj.optools_url,
											message: 'ok',
											resend_timestamp: Date.now(),
										});
									}
								}
								return cb_tx_errors();
							});
						}
					}, () => {
						// finished all errors for this tx
						if (Array.isArray(sig_doc.distribution_responses[tx_pos].errors)) {
							sig_doc.distribution_responses[tx_pos].errors = rebuild_distribution_errors;	// rewrite the errors array
						}
						return cb_sig_col();
					});
				}, () => {
					// finished all txs in sig doc
					const code = decide_code();
					const ratio = resend_successes + '/' + resend_attempts;
					logger.debug('[signature collection] all re-sends are complete. success/total: ' + ratio, code);

					// return early if there is nothing to do
					if (resend_attempts === 0) {
						logger.warn('[signature collection] there were 0 tx errors in sig doc. there is nothing to resend');
						const ret = {
							_status_code: code,
							msg: 'there is nothing to resend. 0 tx errors.',
							tx_id: tx_id,
						};
						return cb_fromAPI(null, ret);
					}

					// build a notification doc
					const notice = { message: 'resend a signature collection tx ' + sig_doc.chanel + ', ' + ratio };
					t.notifications.procrastinate(req, notice);

					// 3. update sig collection doc in db
					writeSignatureCollectionDoc(req, null, sig_doc, (wr_er, wr_resp) => {
						if (typeof wr_resp === 'object') {
							wr_resp._status_code = code;
							wr_resp.resend_errors = resend_errs;					// append the resend errors
						}
						return cb_fromAPI(wr_er, wr_resp);
					});
				});
			}
		});

		// decide response code based on error/success counts
		function decide_code() {
			const resend_errors = resend_attempts - resend_successes;
			if (resend_attempts === 0) {
				return 205;															// nothing was done
			}
			if (resend_successes > 0 && resend_errors > 0) {
				return 207;															// partial success
			}
			if (resend_successes > 0 && resend_errors === 0) {
				return 200;															// total success
			}
			if (resend_errors > 0 && resend_successes === 0) {
				return 502;															// total failure
			}
			return 500;
		}
	};

	// get the signature collection doc by tx_id (even on create to see if id is taken)
	function get_sig_col_by_id(tx_id, cb) {
		const get_opts = {
			db_name: ev.DB_COMPONENTS,
			_id: tx_id,
			SKIP_CACHE: true
		};
		t.otcc.getDoc(get_opts, (err_getSigCollection, resp_getSigCollection) => {
			const error_code = t.ot_misc.get_code(err_getSigCollection);
			if (err_getSigCollection) {
				logger.error('[signature collection] error getting sig col doc for resend tx:', tx_id, error_code, err_getSigCollection);
				return cb({ statusCode: error_code, msg: `Problem getting the signature collection "${tx_id}"` });
			} else {
				logger.debug('[signature collection] sig col doc found for resend tx:', tx_id);
				return cb(null, resp_getSigCollection);
			}
		});
	}

	return exports;
};
