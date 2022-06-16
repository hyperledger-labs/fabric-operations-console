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
/* eslint-disable max-len */
//------------------------------------------------------------
// signature_collection_apis.test.js - Test signature_collection_apis
//------------------------------------------------------------
const common = require('../common-test-framework');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const tools = common.tools;
tools.misc = require('../../../libs/misc.js')(common.logger, common.tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
tools.middleware = common.tools.middleware;
const myutils = require('../../testing-lib/test-middleware');
const signature_collection_objects = require('../../docs/signature_collection_objects.json');

let signature_collection_apis;
let signature_collection_lib;
const id_prv_key_b64 = signature_collection_objects.test_private_key;
const x509_override_object = {
	readCertPEM: () => {
	},
	verifySignature: () => {
		return true;
	}
};

chai.use(chaiHttp);

const createStubs = () => {
	return {
		getDesignDocView: sinon.stub(tools.otcc, 'getDesignDocView'),
		getDoc: sinon.stub(tools.otcc, 'getDoc'),
		getAllPartyData: sinon.stub(tools.signature_collection_lib, 'getAllPartyData'),
		repeatWriteSafe: sinon.stub(tools.otcc, 'repeatWriteSafe'),
		repeatDelete: sinon.stub(tools.otcc, 'repeatDelete'),
		writeDoc: sinon.stub(tools.otcc, 'writeDoc'),
		X509: sinon.stub(tools.js_rsa, 'X509'),
		retry_req: sinon.stub(tools.misc, 'retry_req')
	};
};

function destroy_time(obj) {
	if (obj.distribution_responses) {
		for (let i in obj.distribution_responses) {
			delete obj.distribution_responses[i].timestamp;
		}
	}
	delete obj.timestamp;
	return JSON.stringify(obj);
}

describe('Signature Collection APIs', () => {
	before((done) => {
		tools.stubs = createStubs();
		common.ev.STR.SIG_OPEN = 'open';
		common.ev.STR.SIG_CLOSED = 'closed';
		tools.middleware.verify_view_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_view_action_ak = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_sigCollections_action_session = (req, res, next) => {
			return next();
		};
		tools.middleware.verify_sigCollections_action_ak = (req, res, next) => {
			return next();
		};
		tools.signature_collection_lib.validateApiSignature = (req, res, next) => {
			return next();
		};
		common.ev.HOST_URL = 'http://localhost:3000';
		signature_collection_apis = require('../../../routes/signature_collection_apis.js')(common.logger, common.ev, tools);
		signature_collection_lib = require('../../../libs/signature_collection_lib.js')(common.logger, common.ev, tools);
		this.app = common.expressApp(signature_collection_apis);
		done();
	});
	after(() => {
		myutils.restoreStubs(tools.stubs);
	});

	const get_signature_collection_transactions = () => {
		return [
			{
				itStatement: 'should return the signature collection - all - test_id=jslxzb',
				callFunction: () => {
					tools.stubs.getDesignDocView.callsArgWith(1, null, signature_collection_objects.signature_collections_get_all_return_from_db);
				},
				expectBlock: (res) => {
					const actualResponse = JSON.parse(JSON.stringify(res.body));
					const expectedResponse = JSON.parse(JSON.stringify(signature_collection_objects.signature_collections_get_all_response));

					if (actualResponse && actualResponse.signature_collections && actualResponse.signature_collections[0] &&
						actualResponse.signature_collections[0].tx_id) {
						expectedResponse.signature_collections[0].tx_id = actualResponse.signature_collections[0].tx_id;
					}
					expect(res.status).to.equal(200);
					expect(JSON.stringify(tools.misc.sortKeys(actualResponse))).to.equal(JSON.stringify(tools.misc.sortKeys(expectedResponse)));
				}
			},
			{
				itStatement: 'should return error, which was passed to the getDesignDocView stub test_id=itfrhp',
				callFunction: () => {
					const err = {
						statusCode: 500,
						msg: 'problem getting doc'
					};
					tools.stubs.getDesignDocView.callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.statusCode).to.equal(500);
					expect(res.body.msg).to.equal('problem getting doc');
				}
			}
		];
	};

	const get_single_transaction = () => {
		return [
			{
				itStatement: 'should return the signature collection - single - test_id=huutlc',
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_get_from_db);
				},
				expectBlock: (res) => {
					const actualResponse = JSON.parse(JSON.stringify(res.body));
					const expectedResponse = JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response));

					if (actualResponse && actualResponse.tx_id) {
						expectedResponse.tx_id = actualResponse.tx_id;
					}
					expect(res.status).to.equal(200);
					expect(JSON.stringify(tools.misc.sortKeys(actualResponse))).to.equal(JSON.stringify(tools.misc.sortKeys(expectedResponse)));
				}
			},
			{
				itStatement: 'should return error, which was passed to the getDoc stub test_id=cfnwus',
				callFunction: () => {
					const err = {
						statusCode: 500,
						msg: 'problem getting doc'
					};
					tools.stubs.getDoc.callsArgWith(1, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(res.body.statusCode).to.equal(500);
					expect(res.body.msg).to.equal('problem getting doc');
				}
			}
		];
	};

	const store_signature_collection = () => {
		return [
			{
				itStatement: 'should return a 200 and pretend to write the doc - not append test_id=litbvt',
				body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.X509.returns(x509_override_object);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
					tools.stubs.retry_req.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(destroy_time(res.body)).to.equal(
						JSON.stringify(signature_collection_objects.store_response)
					);
				}
			},
			{
				itStatement: 'should return a 200 and pretend to write the doc - no distribution test_id=dagdzk',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					routeInfo.body.distribute = 'none';
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
					tools.stubs.X509.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					const dt = JSON.parse(destroy_time(res.body));
					if (dt.distribution_responses[0]) {
						delete dt.distribution_responses[0].timestamp;
					}
					expect(dt).to.deep.equal(signature_collection_objects.store_response2);
				}
			},
			{
				itStatement: 'should return an error - non 404 error passed to getDoc stub test_id=znseet',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					routeInfo.body.distribute = 'none';
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 500 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 500, 'msg': 'Problem getting the signature collection "transaction1"' })
					);
				}
			},
			{
				itStatement: 'should return an error - no 404 error passed to getDoc stub - this api does not  update existing docs test_id=spzbcf',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_get_from_db);
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({ 'statusCode': 400, 'msg': 'Signature collection already exists "transaction1"' })
					);
				}
			},
			{
				itStatement: 'should return an error - missing properties test_id=oxtjuw',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					delete routeInfo.body.proposal;
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 400,
							'msg': '["signature cannot be validated. \\"proposal\\" was not found. msp_id: org1"]'
						})
					);
				}
			},
			{
				itStatement: 'should return an error - orgs2sign is an object, not an array test_id=pobkaa',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					routeInfo.body.orgs2sign[0].msp_id = null;
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data_extra);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 400,
							'msg': '["signature cannot be validated. no known root certs for msp_id: null"]'
						})
					);
				}
			},
			{
				itStatement: 'should return an error code and message - error passed to getAllPartyData stub test_id=scqhep',
				body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
				callFunction: () => {
					const err = {};
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, err);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem loading external parties' }));
				}
			},
			{
				itStatement: 'should return a 200 - 1 bad cert & 1 good cert, test_id=xkvpqu',
				body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data_extra);
					tools.stubs.X509.returns(x509_override_object);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
				}
			},
			{
				itStatement: 'should return a 200 - 1 bad cert & 1 good chained cert, test_id=gbwpfo',
				body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data_extra_chain);
					tools.stubs.X509.returns(x509_override_object);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
				}
			},
			{
				itStatement: 'should return an error - 1 bad cert, test_id=garbck',
				body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data_missing_cert_match);
					tools.stubs.X509.restore();
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 400,
							'msg': '["signature is not trusted. no root certs signed the provided cert for msp_id: org1"]'
						})
					);
					tools.stubs.X509 = sinon.stub(tools.js_rsa, 'X509');
				}
			},
			{
				itStatement: 'should return a 400 - missing fields, test_id=szwhkr',
				body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
				callFunction: () => {
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data_missing_cert_field);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(400);
					expect(JSON.stringify(res.body)).to.equal(
						JSON.stringify({
							'statusCode': 400,
							'msg': '["signature cannot be validated. no known root certs for msp_id: org1"]',
						})
					);
				}
			},





			// {
			// 	itStatement: 'should return an error - error passed to "getAllPartyData" stub inside of "createOrAppendSignature"',
			// 	body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
			// 	callFunction: () => {
			// 		tools.stubs.getDoc.callsArgWith(1, { statusCode: 404 });
			// 		tools.stubs.X509.returns(x509_override_object);
			// 		tools.signature_collection_lib.getAllPartyData.restore();
			// 		tools.signature_collection_lib.getAllPartyData = sinon.stub(tools.signature_collection_lib, 'getAllPartyData')
			// 		tools.signature_collection_lib.getAllPartyData.onCall(1).callsArgWith(0, null, signature_collection_objects.all_party_data_extra);
			// 		tools.signature_collection_lib.getAllPartyData.onCall(2).callsArgWith(0, {});
			// 	},
			// 	expectBlock: (res) => {
			// 		console.log(res);
			// 		expect(res).to.equal(undefined);
			// 		// expect(res.status).to.equal(500);
			// 		// expect(JSON.stringify(res.body)).to.equal(JSON.stringify({"statusCode":500,"msg":"problem loading external parties"}));
			// 		// tools.signature_collection_lib.getAllPartyData.resetHistory();
			// 	}
			// },
		];
	};

	const delete_signature_transaction = () => {
		return [
			{
				itStatement: 'should return a 200 and a pleasant message test_id=sjmpmp',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_get_from_db);
					tools.stubs.repeatDelete.callsArgWith(2, null, { _id: 'test_id' });
					tools.stubs.retry_req.callsArgWith(1, null);
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'details': 'removed' }));
				}
			},
			{
				itStatement: 'should return an error and claim the document no longer exists - 404 error passed to repeatDelete stub test_id=tnhtfp',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_get_from_db);
					tools.stubs.repeatDelete.callsArgWith(2, { statusCode: 404 });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'id no longer exists. already deleted?', 'id': ':tx_id' }));
				}
			},
			{
				itStatement: 'should return an error  - non-404 error passed to repeatDelete stub test_id=eahxeg',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
					tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
					tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_get_from_db);
					tools.stubs.repeatDelete.callsArgWith(2, { statusCode: 500 });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500 }));
				}
			}
		];
	};

	const register_external_athenas = () => {
		return [
			{
				itStatement: 'should return a 200 and an ok message test_id=jyeutj',
				callFunction: (routeInfo) => {
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.register_external_athenas_request_body));
					tools.stubs.getDoc.callsArgWith(1, null);
					tools.stubs.repeatWriteSafe.restore();
					tools.stubs.repeatWriteSafe = sinon.stub(tools.otcc, 'repeatWriteSafe');
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'details': [] }));
				}
			},
			{
				itStatement: 'should return an error - error passed to repeatWriteSafe stub test_id=fjvvxz',
				callFunction: (routeInfo) => {
					const err = {
						statusCode: 500,
						msg: 'problem registering external athenas'
					};
					routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.register_external_athenas_request_body));
					tools.stubs.getDoc.callsArgWith(1, null);
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(err, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'could not update external parties doc' }));
				}
			},
			// {
			// 	itStatement: 'should ',
			// 	callFunction: (routeInfo) => {
			// 		routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.register_external_athenas_request_body));
			// 		routeInfo.body._id = 'test_id';
			//
			// 		tools.stubs.getDoc.callsArgWith(1, null);
			// 		tools.stubs.repeatWriteSafe.restore();
			// 		// tools.otcc.repeatWriteSafe({attempt: 1, })
			// 		const externalMspDoc = JSON.parse(JSON.stringify(signature_collection_objects.external_msp_doc_to_write));
			// 		console.log(externalMspDoc.parties)
			// 		tools.stubs.repeatWriteSafe.callsArgWith(1, externalMspDoc);
			// 		tools.couch_lib.writeDoc.callsArgWith(1, signature_collection_objects.external_msp_doc_to_write);
			// 		// tools.stubs.couch_repeatWriteSafe = sinon.stub(tools.couch_lib, 'repeatWriteSafe');
			// 	},
			// 	expectBlock: (res) => {
			// 		// const body = JSON.parse(JSON.stringify(signature_collection_objects.register_external_athenas_request_body));
			// 		// signature_collection_lib.registerExternalAthenas(body, (err, resp) => {
			// 		// 	console.log(err);
			// 		// 	console.log(resp);
			// 		// });
			// 		// expect(res.status).to.equal(500);
			// 		// expect(JSON.stringify(res.body)).to.equal(JSON.stringify({"message":"ok","details":[]}));
			// 	}
			// }
		];
	};

	const list_external_athenas = () => {
		return [
			{
				itStatement: 'should return a 200 and an empty parties array test_id=rbetqo',
				callFunction: () => {
					tools.stubs.getAllPartyData.restore();
					tools.stubs.getDoc.restore();
					tools.stubs.getDesignDocView.restore();
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					const keys = Object.keys(res.body);
					expect(JSON.stringify(keys)).to.equal(JSON.stringify(['parties']));
					tools.stubs.getAllPartyData = sinon.stub(tools.signature_collection_lib, 'getAllPartyData');
					tools.stubs.getDoc = sinon.stub(tools.otcc, 'getDoc');
					tools.stubs.getDesignDocView = sinon.stub(tools.otcc, 'getDesignDocView');
				}
			},
			{
				itStatement: 'should return 200 but exercises logic that logs errors - error passed to getDesignDocView test_id=eoupvd',
				callFunction: () => {
					const resp = JSON.parse(JSON.stringify(signature_collection_objects.external_msp_doc_to_write));
					resp.doc = { admins: 'admin1' };
					// const structure = { rows: [resp] };
					tools.stubs.getAllPartyData.restore();
					tools.stubs.getDoc.callsArgWith(1, null, resp);
					tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, msg: 'problem getting design doc' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify(signature_collection_objects.get_external_parties_response_has_error));
					tools.stubs.getAllPartyData = sinon.stub(tools.signature_collection_lib, 'getAllPartyData');
				}
			},
			{
				itStatement: 'should return a 200 and exercise the 404 logic - 404 error sent to "getDoc" stub test_id=argrvq',
				callFunction: () => {
					tools.stubs.getAllPartyData.restore();
					tools.stubs.getDoc.callsArgWith(1, { statusCode: 404, msg: 'problem listing external athenas' });
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					const keys = Object.keys(res.body);
					expect(JSON.stringify(keys)).to.equal(JSON.stringify(['parties']));
					tools.stubs.getAllPartyData = sinon.stub(tools.signature_collection_lib, 'getAllPartyData');
				}
			},
			{
				itStatement: 'should return an error - error passed to the "getAllPartyData" stub test_id=gkomxt',
				callFunction: () => {
					tools.stubs.getAllPartyData.callsArgWith(0, {
						statusCode: 500,
						msg: 'problem getting getting all party data'
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem getting getting all party data' }));
				}
			}
		];
	};

	const remove_external_athenas = () => {
		return [
			{
				itStatement: 'should return a 200 - no error test_id=ndfhva',
				callFunction: () => {
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb(null, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(200);
					expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'message': 'ok', 'details': [], 'statusCode': 200 }));
				}
			},
			{
				itStatement: 'should return a 500 - error passed to stub test_id=wyzkmz',
				callFunction: () => {
					tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
						return cb({ statusCode: 500, msg: 'not ok', details: [] }, opts.doc);
					});
				},
				expectBlock: (res) => {
					expect(res.status).to.equal(500);
					expect(JSON.stringify(tools.misc.sortItOut(res.body))).to.equal(JSON.stringify(tools.misc.sortItOut({
						'details': [],
						'msg': 'not ok',
						'statusCode': 500
					})));
				}
			}
		];
	};

	const testCollection = [
		// GET /api/v1/signature_collections - Get signature collection transactions
		{
			suiteDescribe: 'GET /api/v1/signature_collections',
			mainDescribe: 'Run GET /api/v1/signature_collections ',
			arrayOfRoutes: ['/api/v1/signature_collections'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_signature_collection_transactions()
				}
			]
		},
		// GET /ak/api/v1/signature_collections - Get signature collection transactions
		{
			suiteDescribe: 'GET /ak/api/v1/signature_collections',
			mainDescribe: 'Run GET /ak/api/v1/signature_collections ',
			arrayOfRoutes: ['/ak/api/v1/signature_collections'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_signature_collection_transactions()
				}
			]
		},
		// GET /api/v1/signature_collections/:tx_id - Get a single signature collection transaction
		{
			suiteDescribe: 'GET /api/v1/signature_collections/:tx_id',
			mainDescribe: 'Run GET /api/v1/signature_collections/:tx_id ',
			arrayOfRoutes: ['/api/v1/signature_collections/:tx_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_single_transaction()
				}
			]
		},
		// GET /ak/api/v1/signature_collections/:tx_id - Get a single signature collection transaction
		{
			suiteDescribe: 'GET /ak/api/v1/signature_collections/:tx_id',
			mainDescribe: 'Run GET /ak/api/v1/signature_collections/:tx_id ',
			arrayOfRoutes: ['/ak/api/v1/signature_collections/:tx_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: get_single_transaction()
				}
			]
		},
		// POST /api/v1/signature_collections - Store signature collection tx
		{
			suiteDescribe: 'POST /api/v1/signature_collections',
			mainDescribe: 'Run POST /api/v1/signature_collections ',
			arrayOfRoutes: ['/api/v1/signature_collections'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.set('Authorization', tools.signature_collection_lib.build_sig_collection_auth_header(routeInfo.body, id_prv_key_b64))
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: store_signature_collection()
				}
			]
		},
		// POST /ak/api/v1/signature_collections - Store signature collection tx
		{
			suiteDescribe: 'POST /ak/api/v1/signature_collections',
			mainDescribe: 'Run POST /ak/api/v1/signature_collections ',
			arrayOfRoutes: ['/ak/api/v1/signature_collections'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.set('Authorization', tools.signature_collection_lib.build_sig_collection_auth_header(routeInfo.body, id_prv_key_b64))
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: store_signature_collection()
				}
			]
		},
		// PUT /api/v1/signature_collections/:tx_id && /ak/api/v1/signature_collections/:tx_id
		{
			suiteDescribe: 'PUT /api/v1/signature_collections/:tx_id && /ak/api/v1/signature_collections/:tx_id',
			mainDescribe: 'Run PUT /api/v1/signature_collections/:tx_id && /ak/api/v1/signature_collections/:tx_id ',
			// arrayOfRoutes: ['/api/v1/signature_collections/transaction1', '/ak/api/v1/signature_collections/transaction1'],
			arrayOfRoutes: ['/api/v1/signature_collections/transaction1'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.set('Authorization', tools.signature_collection_lib.build_sig_collection_auth_header(routeInfo.body, id_prv_key_b64))
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a 200 and pretend to write the doc - is append test_id=tlajhp',
							body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								signature_collection_lib.store_trust_unknown_certs = common.ev.TRUST_UNKNOWN_CERTS;
								common.ev.TRUST_UNKNOWN_CERTS = true;
								tools.stubs.X509.returns(x509_override_object);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								const dt = JSON.parse(destroy_time(res.body));
								dt.distribution_responses.length = 1;
								expect(res.status).to.equal(200);
								expect(JSON.stringify(dt)).to.equal(JSON.stringify(signature_collection_objects.valid_generic_response));
								common.ev.TRUST_UNKNOWN_CERTS = signature_collection_lib.store_trust_unknown_certs;
								delete signature_collection_lib.store_trust_unknown_certs;
								tools.stubs.retry_req.resetHistory();
							}
						},
						{
							itStatement: 'should return a 200 and pretend to write the doc - no distribution test_id=dyeujh',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								routeInfo.body.distribute = 'none';
								tools.stubs.X509.returns(x509_override_object);
								tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.signature_collection_request_body);
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								const dt = JSON.parse(destroy_time(res.body));
								dt.distribution_responses.length = 1;
								expect(res.status).to.equal(200);
								expect(JSON.stringify(dt)).to.equal(JSON.stringify(signature_collection_objects.valid_none_response));
							}
						},
						{
							itStatement: 'should return an success for org that was not asked to sign signature collection test_id=ndznjo',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								routeInfo.body.orgs2sign = [{
									msp_id: 'abc',
									optools_url: 'http://127.0.0.1:2222/api/v1',
									timeout_ms: 10001,
									signature: 'Cu4FCusFCgRtc3AxEuIFLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlCNmpDQ0FaR2dBd0lCQWdJVUtSTHNWN1NwZ1Vxd2VyR2RmRlM3WklqRHQzd3dDZ1lJS29aSXpqMEVBd0l3DQphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLDQpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010DQpZMkV0YzJWeWRtVnlNQjRYRFRFNU1EVXdNekU0TVRrd01Gb1hEVEl3TURVd01qRTRNalF3TUZvd0lURVBNQTBHDQpBMVVFQ3hNR1kyeHBaVzUwTVE0d0RBWURWUVFERXdWaFpHMXBiakJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5DQpBd0VIQTBJQUJNNVgrN29XdWZCZkRBU05FQWtjMUNjYVBVUkJzUS9LaFVTYXlJMGo4UlNFVThscGJxdEs3WWdPDQp0RWlVSTdSVW93Y0k3bEdvTFlJTUJtdFZ6MXhWQ2thallEQmVNQTRHQTFVZER3RUIvd1FFQXdJSGdEQU1CZ05WDQpIUk1CQWY4RUFqQUFNQjBHQTFVZERnUVdCQlNRUHgydk4vSW8wOUd2dmZZZzluUG8wa3RyNkRBZkJnTlZIU01FDQpHREFXZ0JSak9EL0hBZmRRVVZkQzRobVovVHZmTFdZNWJEQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQnJZNnl6DQpLWDB5ODRJQ2NNbHNoOEhLL0p2bFJQdUJ0VG5MK0pzRDJ4U3RlQUlnZnp1cjdjQktiU3psYUo4Q1JLcHh0Qks5DQoxZkM0bWdHdzd3ejB3Z2tta3BNPQ0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ0KEkgwRgIhAKEE9w4VslCivpMJxc+wbZipvz9yX+M8eZ/vb+yEtH3KAiEA7LyJMlYA5jP2bRMVO7//ObOnHITCvpYVd6Hv/b0MNaY=',
									timestamp: 0
								}];
								routeInfo.body.distribute = 'none';
								tools.stubs.X509.returns(x509_override_object);
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(
									JSON.stringify(signature_collection_objects.single_signature_collection_response))
								);
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
							},
							expectBlock: (res) => {
								const dt = JSON.parse(destroy_time(res.body));
								expect(res.status).to.equal(200);
								expect(dt).to.deep.equal(signature_collection_objects.signature_collection_request_body3);
							}
						},
						{
							itStatement: 'should return an error -  test_id=hjooaherror sent to getDoc stub',
							body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body)),
							callFunction: () => {
								const err = {
									statusCode: 500,
									msg: 'problem getting the signature collection'
								};
								tools.stubs.getDoc.callsArgWith(1, err);
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(res.body.statusCode).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(
									JSON.stringify({ 'statusCode': 500, 'msg': 'Problem getting the signature collection "transaction1"' })
								);
							}
						},
						{
							itStatement: 'should return an error - org does not exist test_id=zribqg',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								routeInfo.body.orgs2sign[0].msp_id = 'imaginary_org';
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
							}
						},
						{
							itStatement: 'should return a 200 - valid status property provided test_id=klofin',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								routeInfo.body.status = 'closed';
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.stubs.X509.returns(x509_override_object);
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								const dt = JSON.parse(JSON.stringify(res.body));
								for (const response in dt.distribution_responses) {
									if (dt.distribution_responses[response].timestamp) {
										expect(typeof dt.distribution_responses[response].timestamp).to.equal('number');
									}
									delete dt.distribution_responses[response].timestamp;
								}
								dt.distribution_responses.length = 1;
								expect(res.status).to.equal(200);
								expect(JSON.stringify(dt)).to.equal(JSON.stringify(signature_collection_objects.valid_generic_response2));
							}
						},
						{
							itStatement: 'should error - missing proposal in append - test_id=oxeaom',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								const no_proposal = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								delete no_proposal.proposal;
								tools.stubs.getDoc.callsArgWith(1, null, no_proposal);
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify(signature_collection_objects.missing_proposal));
							}
						},
						{
							itStatement: 'should return an error - no msps found - test_id=drfuan',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								const no_msps = JSON.parse(JSON.stringify(signature_collection_objects.all_party_data));
								delete no_msps.parties.org1;
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, no_msps);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body)).to.equal(
									JSON.stringify({
										'statusCode': 400,
										'msg': '["signature cannot be validated. no known root certs for msp_id: org1"]',
									})
								);
							}
						},
						{
							itStatement: 'should return 200 & write the doc w/new status & visibility - test_id=bzknho',
							body: JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body2)),
							callFunction: () => {
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								signature_collection_lib.store_trust_unknown_certs = common.ev.TRUST_UNKNOWN_CERTS;
								common.ev.TRUST_UNKNOWN_CERTS = true;
								tools.stubs.X509.returns(x509_override_object);
								tools.stubs.writeDoc.callsFake((opts, doc, cb) => {	// use sinon to make a passthrough
									return cb(null, doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null);
								tools.stubs.repeatWriteSafe.restore();
							},
							expectBlock: (res) => {
								const dt = JSON.parse(destroy_time(res.body));
								expect(res.status).to.equal(200);
								expect(dt.status).to.equal('closed');
								expect(dt.visibility).to.equal('archive');
								common.ev.TRUST_UNKNOWN_CERTS = signature_collection_lib.store_trust_unknown_certs;
								delete signature_collection_lib.store_trust_unknown_certs;
								tools.stubs.retry_req.resetHistory();
								tools.stubs.writeDoc.restore();
							}
						},
					]
				}
			]
		},

		// PUT /api/v2/signature_collections/:tx_id && /ak/api/v2/signature_collections/:tx_id
		{
			suiteDescribe: 'PUT /api/v2/signature_collections/:tx_id && /ak/api/v2/signature_collections/:tx_id',
			mainDescribe: 'Run PUT /api/v2/signature_collections/:tx_id && /ak/api/v2/signature_collections/:tx_id ',
			// arrayOfRoutes: ['/api/v2/signature_collections/transaction1', '/ak/api/v1/signature_collections/transaction1'],
			arrayOfRoutes: ['/api/v2/signature_collections/transaction1'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.set('Authorization', tools.signature_collection_lib.build_sig_collection_auth_header(routeInfo.body, id_prv_key_b64))
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an error - invalid status property provided test_id=dtmvfb',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								routeInfo.body.status = 'invalid';
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body)).to.equal(
									JSON.stringify({
										'statusCode': 400,
										'msgs': [
											'Expected parameter \'authorize.certificate\' to be a Base64 encoded PEM-string.',
											'Expected parameter \'status\' to be one of these values: \'open\', \'closed\'.'
										],
										'raw': [
											{
												'key': 'invalid_certificate',
												'symbols': {
													'$PROPERTY_NAME': 'authorize.certificate'
												}
											},
											{
												'key': 'invalid_value',
												'symbols': {
													'$PROPERTY_NAME': 'status',
													'$VALUES': '\'open\', \'closed\''
												}
											}
										]
									})
								);
							}
						},
						{
							itStatement: 'should return an error - invalid visibility property provided test_id=lgrslr',
							callFunction: (routeInfo) => {
								routeInfo.body = JSON.parse(JSON.stringify(signature_collection_objects.signature_collection_request_body));
								routeInfo.body.visibility = 'invalid';
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.signature_collection_lib.getAllPartyData.callsArgWith(0, null, signature_collection_objects.all_party_data);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body)).to.equal(
									JSON.stringify({
										'statusCode': 400,
										'msgs': [
											'Expected parameter \'authorize.certificate\' to be a Base64 encoded PEM-string.',
											'Expected parameter \'visibility\' to be one of these values: \'inbox\', \'archive\'.'
										],
										'raw': [
											{
												'key': 'invalid_certificate',
												'symbols': {
													'$PROPERTY_NAME': 'authorize.certificate'
												}
											},
											{
												'key': 'invalid_value',
												'symbols': {
													'$PROPERTY_NAME': 'visibility',
													'$VALUES': '\'inbox\', \'archive\''
												}
											}
										]
									})
								);
							}
						}
					]
				}
			]
		},

		// PUT /api/v2/signature_collections/:tx_id && /ak/api/v2/signature_collections/:tx_id/resend
		{
			suiteDescribe: 'PUT /api/v2/signature_collections/:tx_id/resend && /ak/api/v2/signature_collections/:tx_id/resend',
			mainDescribe: 'Run PUT /api/v2/signature_collections/:tx_id/resend && /ak/api/v2/signature_collections/:tx_id/resend ',
			arrayOfRoutes: ['/api/v2/signature_collections/transaction1/resend'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.put(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an success w/205 - test_id=yvpjsn',
							callFunction: (routeInfo) => {
								tools.stubs.getDoc.callsArgWith(1, null, JSON.parse(JSON.stringify(signature_collection_objects.single_signature_collection_response)));
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: {} });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(205);
								expect(res.body).to.deep.equal({ msg: 'there is nothing to resend. 0 tx errors.', tx_id: 'transaction1' });
							}
						},
						{
							itStatement: 'should return an success w/200 - test_id=jstuvt',
							callFunction: (routeInfo) => {
								tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_response_w_errors);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 200, body: {} });
							},
							expectBlock: (res) => {
								if (res && res.body && res.body.distribution_responses && res.body.distribution_responses[0]) {
									if (res.body.distribution_responses[0].successes && res.body.distribution_responses[0].successes[0]) {
										res.body.distribution_responses[0].successes[0].resend_timestamp = 0;		// clear it for the compare
									}
									expect(res.status).to.equal(200);
									expect(res.body).to.deep.equal(signature_collection_objects.single_signature_collection_response_w_errors_moved);
								}
							}
						},
						{
							itStatement: 'should return an error w/502 - test_id=antmud',
							callFunction: (routeInfo) => {
								tools.stubs.getDoc.callsArgWith(1, null, signature_collection_objects.single_signature_collection_response_w_errors);
								tools.stubs.repeatWriteSafe.callsFake((opts, mod, cb) => {	// use sinon to make a passthrough - stub, pass argument to response
									return cb(null, opts.doc);
								});
								tools.stubs.retry_req.callsArgWith(1, null, { statusCode: 500, body: {} });
							},
							expectBlock: (res) => {
								if (res && res.body && res.body.distribution_responses && res.body.distribution_responses[0]) {
									expect(res.status).to.equal(502);
									expect(res.body).to.deep.equal(signature_collection_objects.single_signature_collection_response_w_errors_still);
								}
							}
						}
					]
				}
			]
		},


		// DELETE /api/v1/signature_collections/:tx_id - Delete signature(s) collection tx
		{
			suiteDescribe: 'DELETE /api/v1/signature_collections/:tx_id',
			mainDescribe: 'Run DELETE /api/v1/signature_collections/:tx_id ',
			arrayOfRoutes: ['/api/v1/signature_collections/:tx_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.set('Authorization', tools.signature_collection_lib.build_sig_collection_auth_header(routeInfo.body, id_prv_key_b64))
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_signature_transaction()
				}
			]
		},
		// DELETE /ak/api/v1/signature_collections/:tx_id - Delete signature(s) collection tx
		{
			suiteDescribe: 'DELETE /ak/api/v1/signature_collections/:tx_id',
			mainDescribe: 'Run /ak/api/v1/signature_collections/:tx_id ',
			arrayOfRoutes: ['/ak/api/v1/signature_collections/:tx_id'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.set('Authorization', tools.signature_collection_lib.build_sig_collection_auth_header(routeInfo.body, id_prv_key_b64))
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: delete_signature_transaction()
				}
			]
		},
		// POST /api/v1/parties - Register external athenas
		{
			suiteDescribe: 'POST /api/v1/parties',
			mainDescribe: 'Run POST /api/v1/parties ',
			arrayOfRoutes: ['/api/v1/parties'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: register_external_athenas()
				}
			]
		},
		// POST /ak/api/v1/parties - Register external athenas
		{
			suiteDescribe: 'POST /ak/api/v1/parties',
			mainDescribe: 'Run POST /ak/api/v1/parties ',
			arrayOfRoutes: ['/ak/api/v1/parties'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.post(routeInfo.route)
					.send(routeInfo.body)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: register_external_athenas()
				}
			]
		},
		// GET /api/v1/parties - List external athenas
		{
			suiteDescribe: 'GET /api/v1/parties',
			mainDescribe: 'Run GET /api/v1/parties ',
			arrayOfRoutes: ['/api/v1/parties'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: list_external_athenas()
				}
			]
		},
		// GET /ak/api/v1/parties - List external athenas
		{
			suiteDescribe: 'GET /ak/api/v1/parties',
			mainDescribe: 'Run GET /ak/api/v1/parties ',
			arrayOfRoutes: ['/ak/api/v1/parties'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: list_external_athenas()
				}
			]
		},
		// DELETE /api/v1/parties - Remove external athenas
		{
			suiteDescribe: 'DELETE /api/v1/parties',
			mainDescribe: 'Run DELETE /api/v1/parties ',
			arrayOfRoutes: ['/api/v1/parties'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: remove_external_athenas()
				}
			]
		},
		// DELETE /ak/api/v1/parties - Remove external athenas
		{
			suiteDescribe: 'DELETE /ak/api/v1/parties',
			mainDescribe: 'Run DELETE /ak/api/v1/parties ',
			arrayOfRoutes: ['/ak/api/v1/parties'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.delete(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: remove_external_athenas()
				}
			]
		},
		// GET /api/v1/components/msps/:msp_id && /ak/api/v1/components/msps/:msp_id
		{
			suiteDescribe: 'GET /api/v1/components/msps/:msp_id && /ak/api/v1/components/msps/:msp_id',
			mainDescribe: 'Run GET /api/v1/components/msps/:msp_id && /ak/api/v1/components/msps/:msp_id ',
			arrayOfRoutes: ['/api/v1/components/msps/org1', '/ak/api/v1/components/msps/org1'],
			executeRequest: (routeInfo, done) => {
				chai.request(this.app)
					.get(routeInfo.route)
					.end((err, resp) => {
						myutils.handleResponse(err, resp, routeInfo, done);
					});
			},
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a status of 200 and msps array test_id=raijcy',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(signature_collection_objects.external_msp_doc_to_write));
								resp.doc = { msp_id: 'org1' };
								const structure = { rows: [resp] };
								tools.stubs.getDoc.callsArgWith(1, null, resp);
								tools.stubs.getDesignDocView.callsArgWith(1, null, structure);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(200);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'msps': [{ 'msp_id': 'org1' }] }));
							}
						},
						{
							itStatement: 'should return an error and complain that the org cannot be found test_id=eutbru',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(signature_collection_objects.external_msp_doc_to_write));
								tools.stubs.getDoc.callsArgWith(1, null, resp);
								tools.stubs.getDesignDocView.callsArgWith(1, null);
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(400);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 400, 'msg': 'MSP org1 not found' }));
							}
						},
						{
							itStatement: 'should return an error - error passed to getDesignDocView stub test_id=ilupgi',
							callFunction: () => {
								const resp = JSON.parse(JSON.stringify(signature_collection_objects.external_msp_doc_to_write));
								tools.stubs.getDoc.callsArgWith(1, null, resp);
								tools.stubs.getDesignDocView.callsArgWith(1, { statusCode: 500, msg: 'problem getting msps' });
							},
							expectBlock: (res) => {
								expect(res.status).to.equal(500);
								expect(JSON.stringify(res.body)).to.equal(JSON.stringify({ 'statusCode': 500, 'msg': 'problem getting msps' }));
							}
						}
					]
				}
			]
		}
	];
	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
