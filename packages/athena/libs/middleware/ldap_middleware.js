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
// ldap_middleware.js - Middleware for LDAP authentication
//------------------------------------------------------------

module.exports = function (logger, ev, t, common_middle) {
	const middleware = {};

	//--------------------------------------------------
	// Check session to see if the user is logged in
	//--------------------------------------------------
	middleware.isAuthenticated = (req) => {
		const user_data = parseUserData(req);
		const user = user_data ? (user_data.uid || user_data.cn) : null;
		if (!user) {									// if name exist, we are good, i think
			return false;
		} else {
			return true;
		}
	};

	//--------------------------------------------------
	// See what the user can do
	//--------------------------------------------------
	middleware.getActions = (req) => {
		if (!middleware.isAuthenticated(req)) {
			return [];
		} else {
			const user_data = parseUserData(req);
			return user_data ? user_data.authorized_actions : [];
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
			if (user_data) {
				return user_data.givenName || user_data.uid || user_data.cn || null;
			} else {
				return null;
			}
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
			const user_data = parseUserData(req);
			return user_data ? user_data.uid : null;	// its not really a uuid, but uid is close enough
		}
	};

	//--------------------------------------------------
	// Dummy function - not possible for ldap
	//--------------------------------------------------
	middleware.getPasswordType = (req) => {
		return null;
	};

	//--------------------------------------------------
	// Dummy function - not possible for ldap
	//--------------------------------------------------
	middleware.getIamSub = (req) => {
		return null;
	};

	//--------------------------------------------------
	// Dummy function - not possible
	//--------------------------------------------------
	middleware.getIamId = (req) => {
		return null;
	};

	// safely test if couchdb_profile exists
	function parseUserData(req) {
		if (req && req.session && req.session.passport_profile) {
			return req.session.passport_profile;
		}
		return false;
	}

	return middleware;
};
