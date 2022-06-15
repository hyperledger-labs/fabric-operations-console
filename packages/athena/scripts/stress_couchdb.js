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
// stress_couchdb.js - Find rate limit on couch db by running this script, some prior setup required
//------------------------------------------------------------

// -------- set these fields before running the test -------- //
const key = 'api-key-here';
const password = 'api-password-here';
const db = 'db-db629b3083174f5290c139add419664a-components';
const doc_id = '00_template_starter_network';
const couch_url = 'account-id-here-bluemix.cloudant.com';
const db_connection_string = 'https://' + key + ':' + password + '@' + couch_url;
//------------------------------------------------------------


// things we might need
const tools = {
	url: require('url'),
	fs: require('fs'),
	path: require('path'),
	async: require('async'),
	request: require('request'),
	crypto: require('crypto'),
	winston: require('winston'),
};

// logger
let transports = [												// we always have the console transport
	new (tools.winston.transports.Console)({
		colorize: true,
		stderrLevels: [],
		consoleWarnLevels: [],
	})
];
let logger = new (tools.winston.Logger)({
	level: 'silly',
	transports: transports
});

// setup couch lib
tools.misc = require('../libs/misc.js')(logger, tools);
tools.ot_misc = require('../libs/ot_misc.js')(logger, tools);
tools.couch_lib = require('../libs/couchdb.js')(logger, tools, db_connection_string);

// setup tests
let test = [];
for (let i = 0; i < 1000; i++) {			// total tests
	test.push(i);
}

// abuse couch getDoc()
let successes = 0;
logger.info('starting test');
tools.async.eachLimit(test, 400, (test_number, a_cb) => {
	tools.couch_lib.getDoc({ db_name: db, _id: doc_id }, (err, doc) => {
		if (err) {
			logger.error('error:', test_number, err);
		} else {
			logger.debug('success', test_number);
			successes++;
		}
		return a_cb();
	});
}, (err) => {
	logger.info('test done', successes);
});
