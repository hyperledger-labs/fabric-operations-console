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
/* global expect, stitch, assert, common_missing_args */

describe('testing lifecycle 1 (fabric 1.4)', function () {
	window.log.setLevel(1);			// debug log triggers some of the test to do different output
	window.log.log = function () { };
	window.log.debug = function () { };
	window.log.info = function () { };
	window.log.error = function () { };
	window.log.warn = function () { };

	// ---------------------------------------------------------------------------------------------------------------------
	describe('decode_chaincode_query_response', () => {
		it('should decode the get-installed-chaincode response', (done) => {
			const get_ccd_base64_bin = 'CmsKB21hcmJsZXMSBTEuMC4wGjdnaXRodWIuY29tL2libS1ibG9ja2NoYWluL21hcmJsZXMvY2hhaW5jb2RlL3NyYy9tYXJibGVzOiDMqqbmUdgTYFutjY3B/xcqY0XCH6FWRzIlnqm5R2Ap+Q=='; // eslint-disable-line max-len

			stitch.load_pb(() => {
				const input = stitch.base64ToUint8Array(get_ccd_base64_bin);
				const resp = stitch.decode_chaincode_query_response(input);
				const expected = {
					'chaincodesList': [
						{
							'name': 'marbles',
							'version': '1.0.0',
							'path': 'github.com/ibm-blockchain/marbles/chaincode/src/marbles',
							'input': '',
							'escc': '',
							'vscc': '',
							'id': 'zKqm5lHYE2BbrY2Nwf8XKmNFwh+hVkcyJZ6puUdgKfk='
						}
					]
				};
				expect(resp).to.deep.equal(expected);
				done();
			});
		});
	});

	describe('getInstalledChaincode', () => {
		/* removed b/c z network is gone
		it(getId() + 'should return the correctly installed chaincode', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			stitch.getInstalledChaincode(opts, (err, resp) => {
				expect(resp.stitch_msg).to.equal('ok');
				expect(resp.orderer_host).to.equal(opts.orderer_host);
				expect(resp.msp_id).to.equal(opts.msp_id);
				assert.notExists(err);
				done();
			});
		});
		*/
		it('should return an error  - missing inputs', (done) => {
			const options = {
				msp_id: '',			// missing
				client_cert_b64pem: '',
				client_prv_key_b64pem: '',
				host: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8080',
				orderer_host: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8081',
				configtxlator_url: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8083',
			};
			stitch.getInstalledChaincode(options, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});
});
