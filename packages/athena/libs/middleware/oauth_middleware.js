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
// oauth_middleware.js - Generic OAuth 2.0 Middleware for authentication
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const middleware = {};

	//--------------------------------------------------
	// Check session to see if the user is logged in
	//--------------------------------------------------
	middleware.isAuthenticated = (req) => {
		const user_data = getPassportData(req);
		const user = user_data ? (user_data.name || user_data.uid) : null;
		if (!user) {							// if name exist, we are good, i think
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
			const user_data = getPassportData(req);
			let authorized_actions = [];
			if (user_data && user_data.authorized_actions && Array.isArray(user_data.authorized_actions)) {
				authorized_actions = user_data.authorized_actions;
				for (let i in authorized_actions) {
					authorized_actions[i] = authorized_actions[i].toLowerCase();	// sanity, make it lowercase
				}
			}
			return authorized_actions;
		}
	};

	//--------------------------------------------------
	// Get the user's name
	//--------------------------------------------------
	middleware.getName = (req) => {
		if (!middleware.isAuthenticated(req)) {
			return null;
		} else {
			const user_data = getPassportData(req);
			if (user_data) {
				return user_data.givenName || user_data.name || null;
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
			const user_data = getPassportData(req);
			if (user_data && user_data.email) {
				return user_data.email.toLowerCase();
			} else {
				return null;
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
			const user_data = getPassportData(req);
			if (user_data && user_data.uuid) {
				return user_data.uuid;
			}
			if (user_data && user_data.id) {
				return user_data.id;
			}
			if (user_data && user_data.uid) {
				return user_data.uid;
			}
			return null;
		}
	};

	//--------------------------------------------------
	// Dummy function - not possible for generic oauth
	//--------------------------------------------------
	middleware.getPasswordType = (req) => {
		return null;
	};

	//--------------------------------------------------
	// Dummy function - not possible for generic oauth
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

	// safely test if passport.user exists
	function getPassportData(req) {
		if (req && req.session && req.session.passport_profile) {
			return req.session.passport_profile;
		}
		return false;
	}

	return middleware;
};
