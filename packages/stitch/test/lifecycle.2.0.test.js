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
/* global expect, stitch */

describe('testing lifecycle 2 (fabric 2.2)', function () {
	window.log.setLevel(1);			// debug log triggers some of the test to do different output
	window.log.log = function () { };
	window.log.debug = function () { };
	window.log.info = function () { };
	window.log.error = function () { };
	window.log.warn = function () { };

	// ---------------------------------------------------------------------------------------------------------------------
	describe('__decode_query_chaincode_definition_result', () => {
		it('should return decoded ccd result including a collection', (done) => {
			const get_ccd_base64_bin = 'CAESBTEuMC4wGgRlc2NjIgR2c2NjKh8KHQgAEggSBggBEgIIABoPCAASCwoHT3JnMU1TUBAAMk8KTQpLCg9teUNvbGxlY3Rpb24tdjESLgosEgwSCggBEgIIABICCAEaDRILCgdPcmcxTVNQEAEaDRILCgdPcmcyTVNQEAAYASAFKAEwAUIAQgsKB09yZzFNU1AQAUILCgdPcmcyTVNQEAA=';	// eslint-disable-line max-len

			stitch.load_pb(() => {
				const input = stitch.base64ToUint8Array(get_ccd_base64_bin);
				const resp = stitch.lifecycleLib.__decode_query_chaincode_definition_result(input);
				const expected = {
					'sequence': 1,
					'version': '1.0.0',
					'endorsementPlugin': 'escc',
					'validationPlugin': 'vscc',
					'validationParameter': 'AND(\'Org1MSP.MEMBER\')',
					'collections': {
						'config': [
							{
								'static_collection_config': {
									'name': 'myCollection-v1',
									'member_orgs_policy': {
										'signature_policy': 'OR(\'Org1MSP.ADMIN\', \'Org2MSP.MEMBER\')'
									},
									'required_peer_count': 1,
									'maximum_peer_count': 5,
									'block_to_live': 1,
									'member_only_read': true,
									'member_only_write': false,
									'endorsement_policy': {}
								}
							}
						]
					},
					'initRequired': false,
					'approvals': {
						'Org1MSP': true,
						'Org2MSP': false
					}
				};
				expect(resp).to.deep.equal(expected);
				done();
			});
		});
	});

	describe('__decode_query_chaincode_definitions_result', () => {
		it('should return decoded chaincode definitions', (done) => {
			const get_all_ccd_base64_bin = 'Cj8KBWRzaC0xEAEaBTEuMC4wIgRlc2NjKgR2c2NjMh8KHQgAEggSBggBEgIIABoPCAASCwoHT3JnMU1TUBAAOgA=';

			stitch.load_pb(() => {
				const input = stitch.base64ToUint8Array(get_all_ccd_base64_bin);
				const resp = stitch.lifecycleLib.__decode_query_chaincode_definitions_result(input);
				const expected = {
					'chaincodeDefinitions': [
						{
							'name': 'dsh-1',
							'sequence': 1,
							'version': '1.0.0',
							'endorsementPlugin': 'escc',
							'validationPlugin': 'vscc',
							'validationParameter': 'AND(\'Org1MSP.MEMBER\')',
							'collections': {
								'config': []
							},
							'initRequired': false
						}
					]
				};
				expect(resp).to.deep.equal(expected);
				done();
			});
		});
	});

	describe('__decode_check_commit_readiness_result', () => {
		it('should return decoded readiness result (with 1 true and 1 false)', (done) => {
			const check_readiness_base64_bin = 'CgsKB09yZzJNU1AQAAoLCgdPcmcxTVNQEAE=';

			stitch.load_pb(() => {
				const input = stitch.base64ToUint8Array(check_readiness_base64_bin);
				const resp = stitch.lifecycleLib.__decode_check_commit_readiness_result(input);
				const expected = {
					'approvals': {
						'Org2MSP': false,
						'Org1MSP': true
					}
				};
				expect(resp).to.deep.equal(expected);
				done();
			});
		});
	});

	describe('__decode_query_installed_chaincode_result', () => {
		it('should return decoded list of installed cc packages on all channels', (done) => {
			const installed_cc_data_base64_bin = 'Ckx2YXJhZF8xLjIuNDo0ZjFmYzdmNWFhNGExMzM5YzQ0Y2ZjOTYwMTBmNDAxODZmZjMxMzlhNjI4NjkxNjgwMWNiNzFlYTc0YjNiYjE2Egt2YXJhZF8xLjIuNBq+AQoKbXljaGFubmVsMhKvAQoOCgV2YXJhZBIFMS4yLjQKEQoIZHNoLWZpeDQSBTEuMC4wChIKCWRzaC1maXgxMBIFMS4wLjAKEgoJZHNoLWZpeDExEgUxLjAuMAoSCglkc2gtZml4MTISBTEuMi40ChQKC2RzaC1hcG9sbG8xEgUxLjAuMAoUCgtkc2gtYXBvbGxvMhIFMS4wLjAKDwoGdmFyYWQxEgUxLjIuNAoRCghkc2gtZml4MxIFMS4wLjAaGQoFdGhpcmQSEAoOCgVkc2gtMRIFMS4wLjAahQEKCm15Y2hhbm5lbDESdwoNCgRhYmMxEgUxLjIuNAoRCghkc2gtZml4MRIFMS4wLjAKEQoIZHNoLWZpeDISBTEuMC4wChEKCHZhcmFkYWJjEgUxLjIuNAoPCgZ2YXJhZDESBTEuMi40Cg4KBXZhcmFkEgUxLjIuNAoMCgNhYmMSBTEuMi40';	// eslint-disable-line max-len

			stitch.load_pb(() => {
				const input = stitch.base64ToUint8Array(installed_cc_data_base64_bin);
				const resp = stitch.lifecycleLib.__decode_query_installed_chaincode_result(input);
				const expected = {
					'packageId': 'varad_1.2.4:4f1fc7f5aa4a1339c44cfc96010f40186ff3139a6286916801cb71ea74b3bb16',
					'label': 'varad_1.2.4',
					'references': {
						'mychannel2': {
							'chaincodes': [
								{
									'name': 'varad',
									'version': '1.2.4'
								},
								{
									'name': 'dsh-fix4',
									'version': '1.0.0'
								},
								{
									'name': 'dsh-fix10',
									'version': '1.0.0'
								},
								{
									'name': 'dsh-fix11',
									'version': '1.0.0'
								},
								{
									'name': 'dsh-fix12',
									'version': '1.2.4'
								},
								{
									'name': 'dsh-apollo1',
									'version': '1.0.0'
								},
								{
									'name': 'dsh-apollo2',
									'version': '1.0.0'
								},
								{
									'name': 'varad1',
									'version': '1.2.4'
								},
								{
									'name': 'dsh-fix3',
									'version': '1.0.0'
								}
							]
						},
						'third': {
							'chaincodes': [
								{
									'name': 'dsh-1',
									'version': '1.0.0'
								}
							]
						},
						'mychannel1': {
							'chaincodes': [
								{
									'name': 'abc1',
									'version': '1.2.4'
								},
								{
									'name': 'dsh-fix1',
									'version': '1.0.0'
								},
								{
									'name': 'dsh-fix2',
									'version': '1.0.0'
								},
								{
									'name': 'varadabc',
									'version': '1.2.4'
								},
								{
									'name': 'varad1',
									'version': '1.2.4'
								},
								{
									'name': 'varad',
									'version': '1.2.4'
								},
								{
									'name': 'abc',
									'version': '1.2.4'
								}
							]
						}
					}
				};
				expect(resp).to.deep.equal(expected);
				done();
			});
		});
	});

	describe('__decode_query_all_installed_chaincodes_result', () => {
		it('should return decoded list of installed cc packages on all channels', (done) => {
			const all_installed_cc_data_base64_bin = 'Cr8DCkx2YXJhZF8xLjIuNDo0ZjFmYzdmNWFhNGExMzM5YzQ0Y2ZjOTYwMTBmNDAxODZmZjMxMzlhNjI4NjkxNjgwMWNiNzFlYTc0YjNiYjE2Egt2YXJhZF8xLjIuNBqFAQoKbXljaGFubmVsMRJ3ChEKCHZhcmFkYWJjEgUxLjIuNAoPCgZ2YXJhZDESBTEuMi40Cg4KBXZhcmFkEgUxLjIuNAoMCgNhYmMSBTEuMi40Cg0KBGFiYzESBTEuMi40ChEKCGRzaC1maXgxEgUxLjAuMAoRCghkc2gtZml4MhIFMS4wLjAavgEKCm15Y2hhbm5lbDISrwEKDwoGdmFyYWQxEgUxLjIuNAoRCghkc2gtZml4MxIFMS4wLjAKEgoJZHNoLWZpeDEyEgUxLjIuNAoUCgtkc2gtYXBvbGxvMRIFMS4wLjAKFAoLZHNoLWFwb2xsbzISBTEuMC4wCg4KBXZhcmFkEgUxLjIuNAoRCghkc2gtZml4NBIFMS4wLjAKEgoJZHNoLWZpeDEwEgUxLjAuMAoSCglkc2gtZml4MTESBTEuMC4wGhkKBXRoaXJkEhAKDgoFZHNoLTESBTEuMC4w';	// eslint-disable-line max-len

			stitch.load_pb(() => {
				const input = stitch.base64ToUint8Array(all_installed_cc_data_base64_bin);
				const resp = stitch.lifecycleLib.__decode_query_all_installed_chaincodes_result(input);
				const expected = {
					'installedChaincodes': [
						{
							'packageId': 'varad_1.2.4:4f1fc7f5aa4a1339c44cfc96010f40186ff3139a6286916801cb71ea74b3bb16',
							'label': 'varad_1.2.4',
							'references': {
								'mychannel1': {
									'chaincodes': [
										{
											'name': 'varadabc',
											'version': '1.2.4'
										},
										{
											'name': 'varad1',
											'version': '1.2.4'
										},
										{
											'name': 'varad',
											'version': '1.2.4'
										},
										{
											'name': 'abc',
											'version': '1.2.4'
										},
										{
											'name': 'abc1',
											'version': '1.2.4'
										},
										{
											'name': 'dsh-fix1',
											'version': '1.0.0'
										},
										{
											'name': 'dsh-fix2',
											'version': '1.0.0'
										}
									]
								},
								'mychannel2': {
									'chaincodes': [
										{
											'name': 'varad1',
											'version': '1.2.4'
										},
										{
											'name': 'dsh-fix3',
											'version': '1.0.0'
										},
										{
											'name': 'dsh-fix12',
											'version': '1.2.4'
										},
										{
											'name': 'dsh-apollo1',
											'version': '1.0.0'
										},
										{
											'name': 'dsh-apollo2',
											'version': '1.0.0'
										},
										{
											'name': 'varad',
											'version': '1.2.4'
										},
										{
											'name': 'dsh-fix4',
											'version': '1.0.0'
										},
										{
											'name': 'dsh-fix10',
											'version': '1.0.0'
										},
										{
											'name': 'dsh-fix11',
											'version': '1.0.0'
										}
									]
								},
								'third': {
									'chaincodes': [
										{
											'name': 'dsh-1',
											'version': '1.0.0'
										}
									]
								}
							}
						}
					]
				};
				expect(resp).to.deep.equal(expected);
				done();
			});
		});
	});

});
