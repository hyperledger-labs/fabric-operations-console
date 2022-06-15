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
// ibmid_middleware.js - Middleware for IBM ID authentication
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const middleware = {};

	//--------------------------------------------------
	// Check session to see if the user is logged in
	//--------------------------------------------------
	middleware.isAuthenticated = (req) => {
		const user_data = getPassportData(req);
		if (user_data && user_data.name) {				// if name exist, we are good, i think
			return true;
		} else if (user_data && user_data.email) {
			return true;
		} else {
			return false;
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
			}

			// debug for local...
			if (ev.REGION === 'local' && (!authorized_actions || !authorized_actions.includes(ev.STR.VIEW_ACTION))) {
				logger.warn('-!-');
				logger.warn('[middleware] iam rejected you, but b/c you are running local i\'ll let you in. adding all manger actions...');
				logger.warn('-!-');
				for (let i in ev.ROLES_TO_ACTIONS[ev.STR.MANAGER_ROLE]) {
					authorized_actions.push(ev.ROLES_TO_ACTIONS[ev.STR.MANAGER_ROLE][i]);
				}
			}

			for (let i in authorized_actions) {
				authorized_actions[i] = authorized_actions[i].toLowerCase();	// sanity, make it lowercase
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
			const user_data = getPassportData(req);
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
			const user_data = getPassportData(req);
			if (user_data && user_data.iam_id) {			// iam is using this
				return user_data.iam_id;					// activity tracker lib wants the "iam_id" field in the profile
			}
			if (user_data && user_data.id) {
				return user_data.id;
			}
			if (user_data && user_data.user_id) {			// ibmid is using this
				return user_data.user_id;
			}
			return null;
		}
	};

	//--------------------------------------------------
	//  Get the user's "sub" field from IAM (should not require a session)
	//--------------------------------------------------
	middleware.getIamSub = (req) => {
		if (!middleware.isAuthenticated(req)) {
			return null;
		} else {

			// first choice - pull from passport data in session
			const user_data = getPassportData(req);
			if (user_data && user_data.sub) {
				return user_data.sub;								// activity tracker lib wants the "sub" field in the profile
			}
		}

		// second choice - bearer token/api-key auth should end up here
		// get "sub" from inside the access token (aka bearer token) if one was provided to the request
		if (req && req._access_token) {
			const payload = t.permissions_lib.parse_ibp_token(req._access_token);
			if (payload && payload.sub) {
				return payload.sub;									// activity tracker lib wants the "sub" field
			}
		}

		return null;
	};

	//--------------------------------------------------
	//  Get the user's "sub" field from IAM - (should not require a session)
	//--------------------------------------------------
	middleware.getIamId = (req) => {
		if (req && req._access_token) {
			const payload = t.permissions_lib.parse_ibp_token(req._access_token);
			if (payload && payload.iam_id) {
				return payload.iam_id;								// activity tracker lib wants the "iam_id" field
			}
		}

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
