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
// keys_lib.js - keys_apis functions
//------------------------------------------------------------
module.exports = function (logger, ev, t) {
	const exports = {};

	//--------------------------------------------------
	// Store a key in the database
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.store_key = (req, cb) => {
		const user_id = t.middleware.getUuid(req);

		// If they didn't pass a private_key then there's nothing more to do
		if (!req.body.private_key) {
			logger.error('the required property \'private key\' was not sent in the request');
			const err = {};
			err.statusCode = 500;
			err.msg = 'the required property \'private key\' was not sent in the request';
			return cb(err);
		}

		// creating the doc body to create the key doc
		const doc_to_write = {
			name: req.body.name,
			private_key: t.misc.encrypt(req.body.private_key, user_id),
			public_key: req.body.public_key,
			uuid: user_id,
			timestamp: Date.now(),
			type: 'key_doc'
		};

		// build a notification doc
		const notice = { message: 'adding crypto key: ' + doc_to_write.name };
		t.notifications.procrastinate(req, notice);

		logger.debug('creating the key doc in database DB_COMPONENTS');
		// prepare the options to write the doc
		const wr_opts = {
			db_name: ev.DB_COMPONENTS,
			doc: doc_to_write
		};

		// actually write the key doc to the database
		t.otcc.createNewDoc(wr_opts, doc_to_write, (err_writeDoc, resp_writeDoc) => {
			if (err_writeDoc) {
				logger.error('[key lib] unable to write doc for key - failure', err_writeDoc);
				return cb(err_writeDoc);
			} else {
				logger.info('[key lib] created key doc');

				// create the response body to return back to the caller
				const customResponse = {
					'message': 'ok',
					'_id': resp_writeDoc._id,
					'name': req.body.name
				};
				return cb(null, customResponse);
			}
		});
	};

	//--------------------------------------------------
	// Get all keys from the db for the current user
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.get_all_keys = (req, cb) => {

		// get the current user
		const currentUser = t.middleware.getUuid(req);

		// build the opts object needed to do the get
		const opts = {
			db_name: ev.DB_COMPONENTS,			// db for storing things
			_id: '_design/athena-v1',			// name of design doc
			view: 'current_user',
			query: `key="${currentUser}"`,	// returns docs that belong to the current user
			SKIP_CACHE: (req.query.skip_cache === 'yes')
		};

		// get all the docs for the current user
		// only returns key docs that have the property 'type: 'key_doc' and are associated with the current user
		t.otcc.getDesignDocView(opts, (err, resp) => {
			if (err) {
				logger.error('[key lib] unable to get all docs from db', err);
				return cb(err);
			} else {
				logger.info('[key lib] got all keys from db');

				// build response body
				const ret = { keys: {} };
				for (const key of resp.rows) {
					const value = key.value;
					ret.keys[value._id] = {
						name: value.name,
						private_key: t.misc.decrypt(value.private_key, currentUser),
						public_key: value.public_key
					};
				}
				return cb(null, ret);
			}
		});
	};

	//--------------------------------------------------
	// Edit a key in the database
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.edit_key = (req, cb) => {
		const currentUser = t.middleware.getUuid(req);

		// build a notification doc
		const notice = { message: 'editing crypto key: ' + req.params.key_id };
		t.notifications.procrastinate(req, notice);

		// create the opts object to get the doc we want to edit
		const get_opts = {
			db_name: ev.DB_COMPONENTS,		// db for storing things
			_id: req.params.key_id,
			SKIP_CACHE: (req.query.skip_cache === 'yes')
		};

		// first get the doc we want to edit
		// only returns key docs that have the property 'type: 'key_doc' and are associated with the current user
		// t.otcc.getDesignDocView(get_opts, (err_getDoc, resp_getDoc) => {
		t.otcc.getDoc(get_opts, (err_getDoc, resp_getDoc) => {
			if (err_getDoc) {
				logger.error('[key lib] unable to get key doc to edit', err_getDoc);
				return cb(err_getDoc);
			}

			// if we didn't find the doc then we want to return an error to the user
			if (currentUser !== resp_getDoc.uuid) {
				logger.error(`key doc ${get_opts.id} was not found for the current user. If it exists then it is associated with another user`);
				const err = {};
				err.statusCode = 403;
				err.msg = `key doc ${get_opts.id} was not found for the current user. If it exists then it is associated with another user`;
				return cb(err);
			}
			logger.info(`successfully got the doc ${get_opts._id} for editing`);

			// Replace anything that was passed in
			const doc_to_write = resp_getDoc;
			doc_to_write.name = req.body.name ? req.body.name : resp_getDoc.name;
			doc_to_write.private_key = req.body.private_key ? t.misc.encrypt(req.body.private_key, currentUser) : resp_getDoc.private_key;
			doc_to_write.public_key = req.body.public_key ? req.body.public_key : resp_getDoc.public_key;

			// add or overwrite the edited_timestamp property
			doc_to_write.edited_timestamp = Date.now();

			logger.debug(`editing key doc in database ${ev.DB_COMPONENTS}`);

			// create the write opts object to prepare to write the key doc back to the database
			const wr_opts = {
				db_name: ev.DB_COMPONENTS,
				doc: doc_to_write
			};

			// actually write the key doc to the database
			t.otcc.createNewDoc(wr_opts, doc_to_write, (err_writeDoc) => {
				if (err_writeDoc) {
					logger.error('[key lib] unable to write key doc for edit', err_writeDoc);
					return cb(err_writeDoc);
				} else {
					logger.info('[key lib] edit key doc - success');

					// create the response body to return back to the caller
					const customResponse = {
						'message': 'ok',
						'_id': get_opts._id,
						'name': req.body.name
					};
					return cb(null, customResponse);
				}
			});
		});
	};

	//--------------------------------------------------
	// Delete a key doc
	//--------------------------------------------------
	/*
	* req: {}  // request object
	*/
	exports.delete_key_doc = (req, cb) => {
		const currentUser = t.middleware.getUuid(req);

		const notice = { message: 'deleting crypto key: ' + req.params.key_id };
		t.notifications.procrastinate(req, notice);

		const get_opts = {
			db_name: ev.DB_COMPONENTS,		// db for storing things
			_id: req.params.key_id,
			SKIP_CACHE: true
		};

		// first get the doc we want to delete to make sure that the current user owns it
		t.otcc.getDesignDocView(get_opts, (err_getDoc, resp_getDoc) => {
			if (err_getDoc) {
				logger.error('[key lib] unable to get key docs from db', err_getDoc);
				return cb(err_getDoc);
			}

			// if we didn't find the doc then we want to return an error to the user
			if (currentUser !== resp_getDoc.uuid) {
				logger.error(`key doc ${get_opts.id} was not found for the current user. If it exists then it is associated with another user`);
				const err = {};
				err.statusCode = 403;
				err.msg = `key doc ${get_opts.id} was not found for the current user. If it exists then it is associated with another user`;
				return cb(err);
			}
			logger.info(`successfully got the doc ${get_opts._id} for deleting`);

			// create the opts object to delete the key doc
			const delete_opts = {
				_id: req.params.key_id,
				db_name: ev.DB_COMPONENTS
			};

			// actually delete the document
			t.otcc.repeatDelete(delete_opts, 1, (err, resp) => {
				if (err) {
					logger.error('[key lib] unable to delete key doc', err);
					return cb(err);
				} else {
					logger.info('[key lib] key doc deleted - success');
					return cb(null, { message: 'ok', name: resp_getDoc.name });
				}
			});
		});
	};

	return exports;
};
