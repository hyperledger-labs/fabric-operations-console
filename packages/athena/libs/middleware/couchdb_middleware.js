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
// couchdb_middleware.js - Middleware for Couch DB authentication
//------------------------------------------------------------

module.exports = function (logger, ev, t, common_middle) {
	const middleware = {};

	//--------------------------------------------------
	// Check session to see if the user is logged in
	//--------------------------------------------------
	middleware.isAuthenticated = (req) => {
		const user_data = parseUserData(req);
		if (!user_data.name) {		// if name exist, we are good, i think
			return false;
		} else {
			return true;
		}
	};

	//--------------------------------------------------
	// See what the user can do
	//--------------------------------------------------
	middleware.getActions = (req) => {
		let actions = [];
		if (!middleware.isAuthenticated(req)) {
			return [];
		} else {
			const lc_email = middleware.getEmail(req);				// get their email
			if (!lc_email || !ev.ACCESS_LIST[lc_email]) {
				logger.warn('[couchdb auth] cannot find actions by email', t.misc.censorEmail(lc_email));
			} else {
				const roles = ev.ACCESS_LIST[lc_email].roles;		// get their roles from memory
				if (!Array.isArray(roles)) {
					logger.warn('[couchdb auth] "roles" field is not an array. cannot get actions for email:', t.misc.censorEmail(lc_email));
				} else {
					actions = common_middle.buildActionsFromRoles(roles, t.misc.censorEmail(lc_email));
				}
			}
			return actions;
		}
	};

	//--------------------------------------------------
	// Get the user's name
	//--------------------------------------------------
	middleware.getName = (req) => {
		if (!middleware.isAuthenticated(req)) {
			return null;
		} else {
			const user_data = parseUserData(req);
			return user_data ? user_data.name : null;
		}
	};

	//--------------------------------------------------
	// Get the user's email address
	//--------------------------------------------------
	middleware.getEmail = (req) => {
		if (!middleware.isAuthenticated(req)) {
			if (req.using_api_key) {
				return req.using_api_key;				// if there is no session b/c we are using api key, return api key
			}
			return null;
		} else {
			const user_data = parseUserData(req);
			if (user_data && user_data.email) {
				return user_data.email.toLowerCase();
			}
		}
	};

	//--------------------------------------------------
	// Get the user's ID
	//--------------------------------------------------
	middleware.getUuid = (req) => {
		if (!middleware.isAuthenticated(req)) {
			return null;
		} else {
			const userEmail = middleware.getEmail(req);
			if (ev.ACCESS_LIST) {
				for (const email in ev.ACCESS_LIST) {
					if (email === userEmail) {
						return ev.ACCESS_LIST[email].uuid;
					}
				}
			}
		}
	};

	//--------------------------------------------------
	// See if the user is using a default password or not
	//--------------------------------------------------
	middleware.getPasswordType = (req) => {
		if (!middleware.isAuthenticated(req)) {
			return null;
		} else {
			const user_data = parseUserData(req);
			if (user_data && user_data.password_type) {
				return user_data.password_type;
			}
			return null;
		}
	};

	//--------------------------------------------------
	// Dummy function - not possible to get IAM fields w/couchdb auth scheme
	//--------------------------------------------------
	middleware.getIamSub = (req) => {
		return null;
	};

	//--------------------------------------------------
	// Dummy function - not possible to get IAM fields w/couchdb auth scheme
	//--------------------------------------------------
	middleware.getIamId = (req) => {
		return null;
	};

	// safely test if couchdb_profile exists
	function parseUserData(req) {
		if (req && req.session && req.session.couchdb_profile) {
			return req.session.couchdb_profile;
		}
		return false;
	}

	return middleware;
};
