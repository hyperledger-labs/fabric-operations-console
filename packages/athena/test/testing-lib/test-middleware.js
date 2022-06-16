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
/* eslint no-prototype-builtins:0 */
//------------------------------------------------------------
// test-middleware.js - middleware functions for Mocha testing
//------------------------------------------------------------

module.exports.allowAkToDoAction = (req, res, next) => {
	const auth_header_lib = require('../../libs/auth_header_lib.js')(null, null, null);
	const user = auth_header_lib.parse_auth(req.headers);
	if (user.name !== 'admin' || user.pass !== 'random') {
		res.statusCode = 401;
		return next(res);
	} else {
		return next();
	}
};

module.exports.makeAdmin = (req, res, next) => {
	if (!req.session) { req.session = {}; }
	if (!req.session.passport) { req.session.passport = {}; }
	if (!req.session.passport.user) { req.session.passport.user = {}; }
	req.session.passport.user.email = 'someone_else@us.ibm.com';
	req.session.passport.user.name = 'someone_else';
	req.session.destroy = (cb) => { return cb(); };
	return next();
};

module.exports.makeViewer = (req, res, next) => {
	if (!req.session) { req.session = {}; }
	if (!req.session.profile) { req.session.profile = {}; }
	req.session.profile.isViewer = true;
	return next();
};

module.exports.removeRole = (req, res, next) => {
	if (!req.session) { req.session = {}; }
	if (!req.session.profile) { req.session.profile = {}; }
	return next();
};

module.exports.emptyMiddleware = (req, res, next) => {
	return next();
};

module.exports.handleResponse = (err, res, routeInfo, done) => {
	if (err) {
		console.log('We had a boo boo', JSON.stringify(err));
		return done();
	} else {
		routeInfo.expectBlock(res, routeInfo);
		return done();
	}
};

module.exports.restoreStubs = (stubs) => {
	for (const i in stubs) {
		if (stubs.hasOwnProperty(i) && stubs[i].restore) {
			stubs[i].restore();
		}
	}
};
