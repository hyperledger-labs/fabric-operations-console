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
/* global expect, assert, stitch, marbles_packaged_as_hex */
const test_msp_id = 'PeerOrg1';
const test_channel = 'channel1';
const test_consortium_id = 'SampleConsortium';
const test_fabric_version = '1.1';

// a few stitch tests use a v1 EP network - https://ibp-tor.4.secure.blockchain.ibm.com/network/40837bb08f2341ba968741b708517923
// its a keeper network for TOR ZBC02, owned by ibpcicd@us.ibm.com
// stitch tests also need grpc web proxies on david's vm: istillneedthisvm.rtp.raleigh.ibm.com
const options = {
	msp_id: 'PeerOrg1',
	client_cert_b64pem: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJuVENDQVVTZ0F3SUJBZ0lVVW9NVTh6Y3k2bVV5TjQ4Z1ZLNmpmZkxNRFlnd0NnWUlLb1pJemowRUF3SXcKR3pFWk1CY0dBMVVFQXhNUVlXUnRhVzVRWldWeVQzSm5NVU5CTVRBZUZ3MHhPVEV4TWpjeU1UTTVNREJhRncweQpNakV4TWpZeU1UUTBNREJhTUNFeER6QU5CZ05WQkFzVEJtTnNhV1Z1ZERFT01Bd0dBMVVFQXhNRllXUnRhVzR3CldUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFUYVhsOXViUHhPVW5DK2JEbjRjdVhYQnZzRFNVK3cKZGFuTHNncnFvendkK1hBTjV2NTZxeUdWMmVVQjEwbkJOckQ3NWlZdWN2aTdxRWkxZkVDdldGeHJvMkF3WGpBTwpCZ05WSFE4QkFmOEVCQU1DQjRBd0RBWURWUjBUQVFIL0JBSXdBREFkQmdOVkhRNEVGZ1FVbm5yeVpMRFM2M2JpCnF2Tzh3eHVOSUxtMUZYNHdId1lEVlIwakJCZ3dGb0FVQy95OVlYTkpnb3c5Q3c0Zi9tM01rNVY5WkN3d0NnWUkKS29aSXpqMEVBd0lEUndBd1JBSWdjNzM1MzkvK0V5b29rUnJwZktGV2ZLN2xRdnRsRlM2KzA1MFdER28vb1BjQwpJRFNWajhBemdNN1JKQTRkUnNialdiWmljSnVCUm9MdEtrcksxNGs0RGRTTwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo=',	// eslint-disable-line max-len
	client_prv_key_b64pem: 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0lxaUdoK1I4TDRGdzhKd1cKZUd1NWpYOHhXTHh1MEFONVQ3Sm04aURpTmRxaFJBTkNBQVRhWGw5dWJQeE9VbkMrYkRuNGN1WFhCdnNEU1UrdwpkYW5Mc2dycW96d2QrWEFONXY1NnF5R1YyZVVCMTBuQk5yRDc1aVl1Y3ZpN3FFaTFmRUN2V0Z4cgotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCgo=',	// eslint-disable-line max-len
	host: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8080',
	orderer_host: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8081',
	configtxlator_url: 'http://istillneedthisvm.rtp.raleigh.ibm.com:8083',
};

let testId = 0;		// id to print near a test description
function getId() {
	return '[' + pad(++testId, 3) + '] ';
}

// pad left string desired characters
function pad(value, desired) {
	let str = value.toString();
	for (let i = str.length; i < desired; i++) {
		str = '0' + str;
	}
	return str;
}

/*
function containsValue(arr, value) {
	for (const member of arr) {
		const key = Object.keys(member)[0];
		if (member[key] === value) {
			return true;
		}
	}
	return false;
}
*/

// test for if error message for missing input arguments is present
function common_missing_args(err) {
	expect(err.error).to.equal(true);
	expect(err.stitch_msg).to.contain('Missing an argument - MSP ID');
	expect(err.stitch_msg).to.contain('Missing an argument - client private key');
	expect(err.stitch_msg).to.contain('Missing an argument - client certificate');
}

/*
// test stitch success message formats
function common_stitch_ok_fmt(input_opts, err, resp) {
	assert.exists(resp);
	expect(resp.stitch_msg).to.equal('ok');
	expect(resp.error).to.equal(false);
	expect(resp.msp_id).to.equal(test_msp_id);
	expect(resp.data).to.be.a('object');

	if (input_opts.include_bin === true) {
		expect(resp.grpc_message).to.be.a('Uint8Array');
	} else {
		assert.notExists(resp.grpc_message);
	}

	assert.notExists(err);
}
*/

describe('testing', function () {
	this.timeout(5000);
	window.log.setLevel(1);			// debug log triggers some of the test to do different output
	window.log.log = function () { };
	window.log.debug = function () { };
	window.log.info = function () { };
	window.log.error = function () { };
	window.log.warn = function () { };

	// ---------------------------------------------------------------------------------------------------------------------
	describe('buildConfigUpdateTemplateNewChannel', () => {
		testId = 0;

		function common_checks(config_update) {
			expect(config_update.channelId).to.equal(test_channel);
			assert.exists(config_update.writeSet.groups.Application.groups[test_msp_id]);
			expect(config_update.readSet.values.Consortium.value.name).to.equal(test_consortium_id);
			expect(config_update.writeSet.values.Consortium.value.name).to.equal(test_consortium_id);
		}

		it(getId() + 'should return a config update template for fabric 1.0', (done) => {
			const b_opts = {
				channel_id: test_channel,
				consortium_id: test_consortium_id,
				application_msp_ids: [test_msp_id],
				fabric_version: '1.0',
			};
			const config_update = stitch.buildConfigUpdateTemplateNewChannel(b_opts);
			common_checks(config_update);
			const key = Object.keys(config_update.writeSet.groups.Application.values.Capabilities.value.capabilities)[0];
			expect(key).to.equal('V1_0');
			assert.notExists(config_update.writeSet.groups.Application.values.ACLs);
			done();
		});

		it(getId() + 'should return a config update template for fabric 1.1', (done) => {
			const b_opts = {
				channel_id: test_channel,
				consortium_id: test_consortium_id,
				application_msp_ids: [test_msp_id],
				fabric_version: '1.1',
			};
			const config_update = stitch.buildConfigUpdateTemplateNewChannel(b_opts);
			common_checks(config_update);
			const key = Object.keys(config_update.writeSet.groups.Application.values.Capabilities.value.capabilities)[0];
			expect(key).to.equal('V1_1');
			assert.notExists(config_update.writeSet.groups.Application.values.ACLs);
			done();
		});

		it(getId() + 'should return a config update template for fabric 1.2', (done) => {
			const b_opts = {
				channel_id: test_channel,
				consortium_id: test_consortium_id,
				application_msp_ids: [test_msp_id],
				fabric_version: '1.2',
			};
			const config_update = stitch.buildConfigUpdateTemplateNewChannel(b_opts);
			common_checks(config_update);
			const key = Object.keys(config_update.writeSet.groups.Application.values.Capabilities.value.capabilities)[0];
			expect(key).to.equal('V1_2');
			assert.exists(config_update.writeSet.groups.Application.values.ACLs);
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('configUpdateJsonToBinary', () => {
		testId = 0;

		it(getId() + 'should return a config update as binary', (done) => {
			const b_opts = {
				channel_id: test_channel,
				consortium_id: test_consortium_id,
				application_msp_ids: [test_msp_id],
				fabric_version: test_fabric_version,
			};
			const config_update = stitch.buildConfigUpdateTemplateNewChannel(b_opts);
			stitch.configUpdateJsonToBinary(config_update, (err, pb) => {
				assert.exists(pb);
				assert.notExists(err);
				expect(pb).to.be.a('Uint8Array');
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('configUpdateBinaryToJson', () => {
		testId = 0;

		it(getId() + 'should return a config update as json', (done) => {
			const b_opts = {
				channel_id: test_channel,
				consortium_id: test_consortium_id,
				application_msp_ids: [test_msp_id],
				fabric_version: test_fabric_version,
			};
			const config_update = stitch.buildConfigUpdateTemplateNewChannel(b_opts);
			stitch.configUpdateJsonToBinary(config_update, (err, pb) => {
				stitch.configUpdateBinaryToJson(pb, (err, new_config_update) => {
					assert.exists(new_config_update);
					assert.notExists(err);
					expect(new_config_update).to.be.a('Object');

					const str1 = JSON.stringify(config_update);
					const str2 = JSON.stringify(new_config_update);
					expect(str1).to.equal(str2);
					done();
				});
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('legacy aes - encrypt and decrypt - string', () => {
		testId = 0;
		it(getId() + 'should return the original decrypted string', (done) => {
			const passphrase = 'i am a secret';
			const original_str = 'bombs away buddy';
			const encrypted = stitch.encrypt(original_str, passphrase);
			expect(encrypted).to.be.a('string');
			expect(encrypted).with.lengthOf.above(10);

			const decrypted = stitch.decrypt(encrypted, passphrase);
			expect(decrypted).to.equal(original_str);
			done();
		});
	});

	describe('mixed aes - encrypt and decrypt - object', () => {
		testId = 0;
		it(getId() + 'should return the original decrypted string', (done) => {
			const passphrase = 'ibm@ibm.com';
			const original_str = JSON.stringify({
				'ca1 ADMIN': {
					'cert': 'test 1',
					'private_key': 'test 1',
					'cas': []
				},
				'org1admin': {
					'cert': 'test 2',
					'private_key': 'test 2',
					'peers': ['org1_peer1-local']
				}
			});
			const encrypted = stitch.encrypt(original_str, passphrase);		// encrypt w/legacy
			stitch.scDecrypt({ data: encrypted, user: passphrase }, (_, decrypted) => {
				expect(decrypted).to.equal(original_str);
				done();
			});
		});
	});

	describe('subtle aes - encrypt and decrypt - string', () => {
		testId = 0;
		it(getId() + 'should return the original decrypted string', (done) => {
			const passphrase = 'ibm@ibm.com';
			const original_str = 'bombs away buddy';
			stitch.scEncrypt({ msg: original_str, user: passphrase }, (_, encrypted) => {
				stitch.scDecrypt({ data: encrypted, user: passphrase }, (_, decrypted) => {
					expect(decrypted).to.equal(original_str);
					done();
				});
			});
		});
	});

	describe('subtle aes - encrypt and decrypt - object', () => {
		testId = 0;
		it(getId() + 'should return the original decrypted string', (done) => {
			const passphrase = 'ibm@ibm.com';
			const original_str = JSON.stringify({
				'ca1 ADMIN': {
					'cert': 'test 1',
					'private_key': 'test 1',
					'cas': []
				},
				'org1admin': {
					'cert': 'test 2',
					'private_key': 'test 2',
					'peers': ['org1_peer1-local']
				}
			});
			stitch.scEncrypt({ msg: original_str, user: passphrase }, (_, encrypted) => {
				stitch.scDecrypt({ data: encrypted, user: passphrase }, (_, decrypted) => {
					expect(decrypted).to.equal(original_str);
					done();
				});
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('sortObjectOut', () => {
		testId = 0;
		it(getId() + 'should return an ordered object', (done) => {
			const a_mess = {
				aaa: 'first',
				ccc: 'third',
				bbb: 'second',
				d: {
					g: 'sixth',
					f: 'fifth',
					e: 'fourth',
				},
				AA: ['arrays', 'are', 'left', 'alone', 'batman']
			};
			const ordered = stitch.sortObjectOut(a_mess);
			const keys = JSON.stringify(Object.keys(ordered));
			expect(keys).to.equal(JSON.stringify(['AA', 'aaa', 'bbb', 'ccc', 'd']));
			const keys2 = JSON.stringify(Object.keys(ordered.d));
			expect(keys2).to.equal(JSON.stringify(['e', 'f', 'g']));
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getChannelsOnPeer', () => {
		testId = 0;
		/* removed b/c z network is gone
		it(getId() + 'should return the correct channels', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			stitch.getChannelsOnPeer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				const hasProp = containsValue(resp.data.channelsList, test_channel);
				expect(hasProp).to.equal(true);
				done();
			});
		});
		*/
		it(getId() + 'should decode the channels in response', (done) => {
			const base64_bin = 'CgcKBXRoaXJkCgwKCm15Y2hhbm5lbDEKDAoKbXljaGFubmVsMg==';
			const input = stitch.base64ToUint8Array(base64_bin);
			const p_channel_query_response = stitch.Query_ChannelQueryResponse.deserializeBinary(input);
			const ret = p_channel_query_response.toObject();
			const expected = {
				channelsList: [
					{ channelId: 'third' },
					{ channelId: 'mychannel1' },
					{ channelId: 'mychannel2' }
				]
			};
			expect(ret).to.deep.equal(expected);
			done();
		});
		it(getId() + 'should return an error - missing inputs', (done) => {
			stitch.getChannelsOnPeer({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getChannelConfigFromPeer', () => {
		testId = 0;
		/* removed b/c z network is gone
		it(getId() + 'should return the correct channel config', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			stitch.getChannelConfigFromPeer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.channel_id).to.equal(test_channel);
				done();
			});
		});
		it(getId() + 'should return the correct channel config w/protobuf', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			opts.include_bin = true;
			stitch.getChannelConfigFromPeer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.channel_id).to.equal(test_channel);
				done();
			});
		});*/
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.getChannelConfigFromPeer({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});


	// ---------------------------------------------------------------------------------------------------------------------
	describe('getChannelInfoFromPeer', () => {
		testId = 0;
		/* removed b/c z network is gone
		it(getId() + 'should return the correct channel info', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			stitch.getChannelInfoFromPeer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.channel_id).to.equal(test_channel);
				done();
			});
		});
		*/
		it(getId() + 'should decode the channels info in response', (done) => {
			const base64_bin = 'CAcSIL7poW8dMf/HGzF1dq3SSPx0iKnW7B3Jc709HDCC6KNHGiD7lMOEJq6sOJtdZPQIxpYuQt+6XC+69svIKE7XLuReZg==';
			const input = stitch.base64ToUint8Array(base64_bin);
			const p_blockchain_info = stitch.Ledger_BlockchainInfo.deserializeBinary(input);
			const ret = p_blockchain_info.toObject();
			const expected = {
				height: 7,
				currentblockhash: 'vumhbx0x/8cbMXV2rdJI/HSIqdbsHclzvT0cMILoo0c=',
				previousblockhash: '+5TDhCaurDibXWT0CMaWLkLfulwvuvbLyChO1y7kXmY=',
				//channel_id: 'third'
			};
			expect(ret).to.deep.equal(expected);
			done();
		});
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.getChannelInfoFromPeer({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getChannelsGenesisFromOrderer', () => {
		testId = 0;
		/* removed b/c z network is gone
		it(getId() + 'should return the correct channel genesis from the orderer', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			stitch.getChannelsGenesisFromOrderer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.channel_id).to.equal(test_channel);
				done();
			});
		});
		*/
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.getChannelsGenesisFromOrderer({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('joinPeerToChannel', () => {
		testId = 0;
		/*it(getId() + 'should return an error - peer was already joined to the channel', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			stitch.joinPeerToChannel(opts, (err, resp) => {
				expect(err.stitch_msg).to.contains('LedgerID already exists');
				assert.notExists(resp);
				done();
			});
		});*/
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.joinPeerToChannel({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getChannelBlockFromPeer', () => {
		testId = 0;
		/* removed b/c z network is gone
		it(getId() + 'should return the correct channel block from peer', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			opts.block_number = 0;
			stitch.getChannelBlockFromPeer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.block.header.number).to.equal(opts.block_number);
				done();
			});
		});
		*/
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.getChannelBlockFromPeer({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getInstantiatedChaincode', () => {
		testId = 0;
		//it(getId() + 'should return the correct instantiated chaincode', (done) => {
		//	const opts = JSON.parse(JSON.stringify(options));
		//	opts.channel_id = test_channel;
		//	stitch.getInstantiatedChaincode(opts, (err, resp) => {
		//		expect(resp.stitch_msg).to.equal('ok');
		//		expect(resp.data.chaincodesList.length).to.equal(5);
		//		expect(resp.data.chaincodesList[1].name).to.equal('marbles2');
		//		done();
		//	});
		//});
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.getInstantiatedChaincode({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('instantiateChaincode', () => {
		testId = 0;
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('upgradeChaincode', () => {
		testId = 0;
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getChannelConfigBlockFromOrderer', () => {
		testId = 0;
		/* removed b/c z network is gone
		it(getId() + 'should return the correct instantiated chaincode', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			stitch.getChannelConfigBlockFromOrderer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.channel_id).to.equal(test_channel);
				done();
			});
		});
		it(getId() + 'should return the correct instantiated chaincode w/protobuf', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.channel_id = test_channel;
			opts.include_bin = true;
			stitch.getChannelConfigBlockFromOrderer(opts, (err, resp) => {
				common_stitch_ok_fmt(opts, err, resp);
				expect(resp.data.channel_id).to.equal(test_channel);
				done();
			});
		});
		*/
		it(getId() + 'should return an error  - missing inputs', (done) => {
			stitch.getChannelConfigBlockFromOrderer({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('getTransactionById', () => {
		testId = 0;
		//it(getId() + 'should return the correct instantiated chaincode', (done) => {
		//	const opts = JSON.parse(JSON.stringify(options));
		//	opts.channel_id = test_channel;
		//	opts.tx_id = 'cf76cbdbc79a567cd2e19536e37d3801a9fd0af5bd655e8ab8267f450bcb9cea';
		//	stitch.getTransactionById(opts, (err, resp) => {
		//		expect(resp.stitch_msg).to.equal('ok');
		//		expect(resp.data.channel_id).to.equal(test_channel);
		//		expect(resp.data.tx_id).to.equal('cf76cbdbc79a567cd2e19536e37d3801a9fd0af5bd655e8ab8267f450bcb9cea');
		//		done();
		//	});
		//});
		it(getId() + 'should return the correct instantiated chaincode  - missing inputs', (done) => {
			stitch.getTransactionById({}, (err, resp) => {
				common_missing_args(err);
				assert.notExists(resp);
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('signConfigUpdate', () => {
		testId = 0;
		it(getId() + 'should return a signed protobuf given base 64 PEMs', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.protobuf = new Uint8Array(10);									// a config update message in binary
			stitch.signConfigUpdate(opts, (err, config_signature_as_b64) => {
				assert.notExists(err);
				assert.exists(config_signature_as_b64);
				expect(config_signature_as_b64).to.be.a('string');
				expect(config_signature_as_b64).with.lengthOf.above(100);		// typically its length 1500+
				done();
			});
		});

		it(getId() + 'should return a signed protobuf given PEM files', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.client_cert_b64pem = atob(opts.client_cert_b64pem); 			// decode it
			opts.client_prv_key_b64pem = atob(opts.client_prv_key_b64pem);		// decode it
			opts.protobuf = new Uint8Array(10);									// a config update message in binary
			stitch.signConfigUpdate(opts, (err, config_signature_as_b64) => {
				assert.notExists(err);
				assert.exists(config_signature_as_b64);
				expect(config_signature_as_b64).to.be.a('string');
				expect(config_signature_as_b64).with.lengthOf.above(100);		// typically its length 1500+
				done();
			});
		});

		it(getId() + 'should return a signed protobuf given base 64 PEMs && base64 config update', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.protobuf = btoa('this should be okay for a test');				// a config update message in base64
			stitch.signConfigUpdate(opts, (err, config_signature_as_b64) => {
				assert.notExists(err);
				assert.exists(config_signature_as_b64);
				expect(config_signature_as_b64).to.be.a('string');
				expect(config_signature_as_b64).with.lengthOf.above(100);		// typically its length 1500+
				done();
			});
		});

		it(getId() + 'should return an error - bad input "protobuf"', (done) => {
			const opts = JSON.parse(JSON.stringify(options));
			opts.protobuf = { this: 'should not work' };
			stitch.signConfigUpdate(opts, (err, config_signature_as_b64) => {
				assert.notExists(config_signature_as_b64);
				assert.exists(err);
				expect(err.stitch_msg).to.contain('"protobuf" is not Uint8Array');
				done();
			});
		});

		it(getId() + 'should return an error - missing inputs', (done) => {
			stitch.signConfigUpdate({}, (err, config_signature_as_b64) => {
				assert.exists(err);
				expect(err.error).to.equal(true);
				expect(err.stitch_msg).to.contain('could not import private key, malformed?');
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('parseChaincodePackage', () => {
		testId = 0;
		it(getId() + 'should return a chaincode object', (done) => {
			const marbles = stitch.hexStrToUint8Array(marbles_packaged_as_hex);
			const parsed = stitch.parseChaincodePackage(marbles);
			assert.exists(parsed);
			expect(parsed.name).to.equal('marbles1');
			expect(parsed.version).to.equal('1.0.0');
			expect(parsed.path).to.equal('github.com/ibm-blockchain/marbles/chaincode/src/marbles');
			expect(parsed.type).to.equal('golang');
			assert.exists(parsed.input);
			assert.exists(parsed.timeout);
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('uint8ArrayToBase64 && base64ToUint8Array', () => {
		testId = 0;
		const input_array = new Uint8Array([1, 2, 3, 0, 6, 92, 128, 155, 255]);
		const input_base64 = 'AQIDAAZcgJv/';
		it(getId() + 'should return a base 64 string', (done) => {
			const base64 = stitch.uint8ArrayToBase64(input_array);
			expect(base64).to.be.a('string');
			expect(base64).to.equal(input_base64);
			done();
		});
		it(getId() + 'should return a Uint8Array', (done) => {
			const array = stitch.base64ToUint8Array(input_base64);
			expect(array).to.be.a('Uint8Array');
			expect(JSON.stringify(array)).to.equal(JSON.stringify(input_array));
			done();
		});
		it(getId() + 'should go to base64 and back w/o change 1', (done) => {
			const input_array = new Uint8Array([1, 2, 3, 0, 6, 92, 128, 131, 155, 255, 233]);
			const base64 = stitch.uint8ArrayToBase64(input_array);
			expect(base64).to.be.a('string');
			const array = stitch.base64ToUint8Array(base64);
			expect(array).to.be.a('Uint8Array');
			expect(JSON.stringify(array)).to.equal(JSON.stringify(input_array));
			done();
		});
		it(getId() + 'should go to base64 and back w/o change 2', (done) => {
			const input_array = new Uint8Array([48,
				69,
				2,
				32,
				118,
				99,
				67,
				82,
				132,
				200,
				90,
				143,
				5,
				139,
				140,
				252,
				11,
				68,
				204,
				37,
				133,
				119,
				239,
				6,
				4,
				243,
				114,
				83,
				235,
				182,
				81,
				120,
				85,
				18,
				178,
				75,
				2,
				33,
				0,
				169,
				28,
				111,
				73,
				154,
				116,
				69,
				2,
				99,
				151,
				41,
				79,
				124,
				248,
				24,
				170,
				66,
				143,
				224,
				157,
				136,
				35,
				77,
				238,
				198,
				212,
				246,
				169,
				144,
				162,
				95,
				180]);
			const base64 = stitch.uint8ArrayToBase64(input_array);
			expect(base64).to.be.a('string');
			const array = stitch.base64ToUint8Array(base64);
			expect(array).to.be.a('Uint8Array');
			expect(JSON.stringify(array)).to.equal(JSON.stringify(input_array));
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('scGetHashAsHex', () => {
		testId = 0;
		it(getId() + 'should return a sha 256 hash from str', (done) => {
			stitch.scGetHashAsHex('something', (_, hash) => {
				expect(hash).to.equal('3fc9b689459d738f8c88a3a48aa9e33542016b7a4052e001aaa536fca74813cb');
				done();
			});
		});

		it(getId() + 'should return a sha 256 hash from bin', (done) => {
			stitch.scGetHashAsHex(new Uint8Array([137, 102, 148, 130, 33, 42, 47, 205, 215, 19]), (_, hash) => {
				expect(hash).to.equal('4db4f7be3cba87040743aaa7e883f34d8dd7a8dfeadaffd7bcc94e5d84e587b3');
				done();
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('scSign', () => {
		testId = 0;
		it(getId() + 'should return signed data', (done) => {
			const data = 'something here';
			stitch.scGenEcdsaKeys(null, (_, key_pair) => {
				const s_opts = {
					prvKeyPEM: key_pair.prvKeyPEM,
					b_msg: stitch.utf8StrToUint8Array(data)
				};
				stitch.scSign(s_opts, (_, signature) => {
					expect(signature).to.not.equal(null);		// if its anything, it didn't error
					done();
				});
			});
		});
	});

	describe('subtleVerifySignatureDer w/DER', () => {
		testId = 0;
		it(getId() + 'should return true (2)', (done) => {
			const data = 'the cloud people will rule us all';
			const raw = stitch.utf8StrToUint8Array(data);
			stitch.scGenEcdsaKeys(null, (_, key_pair) => {
				const jwk = stitch.pem2jwks({ pubKeyPEM: key_pair.pubKeyPEM, prvKeyPEM: key_pair.prvKeyPEM });
				const s_opts = {
					prvKeyPEM: key_pair.prvKeyPEM,
					b_msg: raw
				};
				stitch.scSign(s_opts, (_, der_signature) => {
					stitch.importJwkEcdsaKey(jwk.public, (_, cryptoKey1) => {
						stitch.subtleVerifySignatureDer(cryptoKey1, der_signature, raw, (_, valid) => {
							expect(valid).to.equal(true);
							done();
						});
					});
				});
			});
		});
	});

	describe('scVerifySignature w/DER', () => {
		testId = 0;
		it(getId() + 'should return true (3)', (done) => {
			const data = 'lizard people are among us';
			const raw = stitch.utf8StrToUint8Array(data);
			stitch.scGenEcdsaKeys(null, (_, key_pair) => {
				const s_opts = {
					prvKeyPEM: key_pair.prvKeyPEM,
					b_msg: raw
				};
				stitch.scSign(s_opts, (_, der_signature) => {
					const opts = {
						certificate_b64pem: key_pair.pubKeyPEMb64,
						der_sig: der_signature,
						b_msg: raw
					};
					stitch.scVerifySignature(opts, (_, valid) => {
						expect(valid).to.equal(true);
						done();
					});
				});
			});
		});
	});

	describe('scVerifySignature w/DER', () => {
		testId = 0;
		it(getId() + 'should return true (4)', (done) => {
			const data = 'lizard people are among us??';
			const raw = stitch.utf8StrToUint8Array(data);
			stitch.scGenEcdsaKeys(null, (_, key_pair) => {
				const s_opts = {
					prvKeyPEM: key_pair.prvKeyPEM,
					b_msg: raw
				};
				stitch.scSign(s_opts, (_, der_signature) => {
					const opts = {
						certificate_b64pem: key_pair.pubKeyPEMb64,
						der_sig: der_signature,
						b_msg: raw
					};
					stitch.scVerifySignature(opts, (_, valid) => {
						expect(valid).to.equal(true);
						done();
					});
				});
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('underscores_2_camelCase', () => {
		testId = 0;

		it(getId() + 'should return camelCase object', (done) => {
			const opts = {
				testing_this: 'thing',
				polar: {
					bear_jumped: {
						over_the_lazy: 'dog'
					}
				},
				leave: 'this_alone'
			};
			const formatted = stitch.underscores_2_camelCase(opts);
			const expected = {
				testingThis: 'thing',
				polar: {
					bearJumped: {
						overTheLazy: 'dog'
					}
				},
				leave: 'this_alone'
			};
			expect(JSON.stringify(formatted)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return null', (done) => {
			const opts = ['nothing_to_do', 'here'];
			const formatted = stitch.underscores_2_camelCase(opts);
			expect(JSON.stringify(formatted)).to.equal(JSON.stringify(opts));
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('fmtChaincodeProposalOpts', () => {
		testId = 0;

		it(getId() + 'should return options for a cc proposal - fabric policy formats + "member_orgs_policy" [v1]', (done) => {
			const opts = {
				msp_id: test_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				host: options.host,
				orderer_host: options.orderer_host,
				channel_id: test_channel,
				chaincode_id: 'marbles',
				chaincode_version: 'v1',
				chaincode_type: 'golang',
				chaincode_function: 'init',			// name of chaincode function to call to start
				chaincode_args: ['123456'],			// chaincode str arguments to pass to chaincode function
				endorsement_policy: {
					version: 0,
					identities: [{
						principal: {
							mspIdentifier: test_msp_id,
							role: 'ADMIN'
						}
					}],
					rule: {
						nOutOf: {
							n: 1,
							rules: [{
								signedBy: 0
							}]
						}
					}
				},
				static_collection_configs: [{
					name: 'myPolicy',
					member_orgs_policy: {
						version: 0,
						identities: [{
							principal: {
								mspIdentifier: test_msp_id,
								role: 'ADMIN'
							}
						}],
						rule: {
							nOutOf: {
								n: 1,
								rules: [{
									signedBy: 0
								}]
							}
						}
					},
					required_peer_count: 2,
					maximum_peer_count: 4,
					block_to_live: 0,
				}],
			};
			const fmt_opts = stitch.fmtChaincodeProposalOpts(opts);
			//console.log('\n\n?', JSON.stringify(fmt_opts, null, 2));
			const expected = {
				'msp_id': test_msp_id,
				'client_cert_b64pem': options.client_cert_b64pem,
				'client_prv_key_b64pem': options.client_prv_key_b64pem,
				'channel_id': test_channel,
				'chaincode_id': 'lscc',
				'chaincode_type': 1,
				'chaincode_args': [
					test_channel,
					'\n!\b\u0001\u0012\r\u0012\u0007marbles\u001a\u0002v1\u001a\u000e\n\u0004init\n\u0006123456',
					'\b\u0000\u0012\b\u0012\u0006\b\u0001\u0012\u0002\b\u0000\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0001',
					'',
					'',
					'\n8\n6\n\bmyPolicy\u0012 \n\u001e\b\u0000\u0012\b\u0012\u0006\b\u0001\u0012\u0002\b\u0000\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0001\u0018\u0002 \u0004(\u00000\u00008\u0000'	// eslint-disable-line max-len
				],
				'transientMap': null
			};
			expect(JSON.stringify(fmt_opts)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return options for a cc proposal - sdk policy formats + "member_orgs_policy" [v2]', (done) => {
			const opts = {
				msp_id: test_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				host: options.host,
				orderer_host: options.orderer_host,
				channel_id: test_channel,
				chaincode_id: 'marbles',
				chaincode_version: 'v2',
				chaincode_type: 'golang',
				chaincode_function: 'init',			// name of chaincode function to call to start
				chaincode_args: ['123456'],			// chaincode str arguments to pass to chaincode function
				endorsement_policy: {
					identities: [
						{
							role: {
								name: 'member',
								mspId: test_msp_id
							}
						},
					],
					policy: {
						'1-of': [
							{ 'signed-by': 0 },
							{ 'signed-by': 1 },
						]
					}
				},
				static_collection_configs: [{
					name: 'myPolicy',
					member_orgs_policy: {
						identities: [
							{
								role: {
									name: 'member',
									mspId: test_msp_id
								}
							}
						],
						policy: {
							'1-of': [
								{ 'signed-by': 0 },
							]
						}
					},
					required_peer_count: 2,
					maximum_peer_count: 4,
					block_to_live: 0,
				}],
			};
			const fmt_opts = stitch.fmtChaincodeProposalOpts(opts);
			//console.log('\n\n?', JSON.stringify(fmt_opts, null, 2));
			const expected = {
				'msp_id': test_msp_id,
				'client_cert_b64pem': options.client_cert_b64pem,
				'client_prv_key_b64pem': options.client_prv_key_b64pem,
				'channel_id': test_channel,
				'chaincode_id': 'lscc',
				'chaincode_type': 1,
				'chaincode_args': [
					test_channel,
					'\n!\b\u0001\u0012\r\u0012\u0007marbles\u001a\u0002v2\u001a\u000e\n\u0004init\n\u0006123456',
					'\b\u0000\u0012\f\u0012\n\b\u0001\u0012\u0002\b\u0000\u0012\u0002\b\u0001\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0000',
					'',
					'',
					'\n8\n6\n\bmyPolicy\u0012 \n\u001e\b\u0000\u0012\b\u0012\u0006\b\u0001\u0012\u0002\b\u0000\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0000\u0018\u0002 \u0004(\u00000\u00008\u0000'
				],
				'transientMap': null
			};
			expect(JSON.stringify(fmt_opts)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return options for a cc proposal - sdk policy formats + "policy" [v3]', (done) => {
			const opts = {
				msp_id: test_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				host: options.host,
				orderer_host: options.orderer_host,
				channel_id: test_channel,
				chaincode_id: 'marbles',
				chaincode_version: 'v3',
				chaincode_type: 'golang',
				chaincode_function: 'init',			// name of chaincode function to call to start
				chaincode_args: ['123456'],			// chaincode str arguments to pass to chaincode function
				endorsement_policy: {
					identities: [
						{
							role: {
								name: 'member',
								mspId: test_msp_id
							}
						},
					],
					policy: {
						'1-of': [
							{ 'signed-by': 0 },
							{ 'signed-by': 1 },
						]
					}
				},
				static_collection_configs: [{
					name: 'myPolicy',
					policy: {
						identities: [
							{
								role: {
									name: 'member',
									mspId: test_msp_id
								}
							}
						],
						policy: {
							'1-of': [
								{ 'signed-by': 0 },
							]
						}
					},
					required_peer_count: 2,
					maximum_peer_count: 4,
					block_to_live: 0,
				}],
			};
			const fmt_opts = stitch.fmtChaincodeProposalOpts(opts);
			//console.log('\n\n?', JSON.stringify(fmt_opts, null, 2));
			const expected = {
				'msp_id': test_msp_id,
				'client_cert_b64pem': options.client_cert_b64pem,
				'client_prv_key_b64pem': options.client_prv_key_b64pem,
				'channel_id': test_channel,
				'chaincode_id': 'lscc',
				'chaincode_type': 1,
				'chaincode_args': [
					test_channel,
					'\n!\b\u0001\u0012\r\u0012\u0007marbles\u001a\u0002v3\u001a\u000e\n\u0004init\n\u0006123456',
					'\b\u0000\u0012\f\u0012\n\b\u0001\u0012\u0002\b\u0000\u0012\u0002\b\u0001\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0000',
					'',
					'',
					'\n8\n6\n\bmyPolicy\u0012 \n\u001e\b\u0000\u0012\b\u0012\u0006\b\u0001\u0012\u0002\b\u0000\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0000\u0018\u0002 \u0004(\u00000\u00008\u0000'
				],
				'transientMap': null
			};
			//console.log('\n\n!', JSON.stringify(expected, null, 2));
			expect(JSON.stringify(fmt_opts)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return null for a cc proposal - missing "policy" [v4]', (done) => {
			const opts = {
				msp_id: test_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				host: options.host,
				orderer_host: options.orderer_host,
				channel_id: test_channel,
				chaincode_id: 'marbles',
				chaincode_version: 'v4',
				chaincode_type: 'golang',
				chaincode_function: 'init',	// name of chaincode function to call to start
				chaincode_args: ['123456'],				// chaincode str arguments to pass to chaincode function
				static_collection_configs: [{
					name: 'myPolicy',
					barf: {
						identities: [
							{
								role: {
									name: 'member',
									mspId: test_msp_id
								}
							}
						],
						policy: {
							'1-of': [
								{ 'signed-by': 0 },
							]
						}
					},
					required_peer_count: 2,
					maximum_peer_count: 4,
					block_to_live: 0,
				}],
			};
			const fmt_opts = stitch.fmtChaincodeProposalOpts(opts);
			//console.log('\n\n?', JSON.stringify(fmt_opts, null, 2));
			expect(fmt_opts).to.equal(null);
			done();
		});

		it(getId() + 'should return options for a cc proposal - sdk policy formats + "max_peer_count" [v5]', (done) => {
			const opts = {
				msp_id: test_msp_id,
				client_cert_b64pem: options.client_cert_b64pem,
				client_prv_key_b64pem: options.client_prv_key_b64pem,
				host: options.host,
				orderer_host: options.orderer_host,
				channel_id: test_channel,
				chaincode_id: 'marbles',
				chaincode_version: 'v5',
				chaincode_type: 'golang',
				chaincode_function: 'init',			// name of chaincode function to call to start
				chaincode_args: ['123456'],			// chaincode str arguments to pass to chaincode function
				endorsement_policy: {
					identities: [
						{
							role: {
								name: 'member',
								mspId: test_msp_id
							}
						},
					],
					policy: {
						'1-of': [
							{ 'signed-by': 0 },
							{ 'signed-by': 1 },
						]
					}
				},
				static_collection_configs: [{
					name: 'myPolicy',
					policy: {
						identities: [
							{
								role: {
									name: 'member',
									mspId: test_msp_id
								}
							}
						],
						policy: {
							'1-of': [
								{ 'signed-by': 0 },
							]
						}
					},
					required_peer_count: 2,
					max_peer_count: 4,
					block_to_live: 0,
				}],
			};
			const fmt_opts = stitch.fmtChaincodeProposalOpts(opts);
			//console.log('\n\n?', JSON.stringify(fmt_opts, null, 2));
			const expected = {
				'msp_id': test_msp_id,
				'client_cert_b64pem': options.client_cert_b64pem,
				'client_prv_key_b64pem': options.client_prv_key_b64pem,
				'channel_id': test_channel,
				'chaincode_id': 'lscc',
				'chaincode_type': 1,
				'chaincode_args': [
					test_channel,
					'\n!\b\u0001\u0012\r\u0012\u0007marbles\u001a\u0002v5\u001a\u000e\n\u0004init\n\u0006123456',
					'\b\u0000\u0012\f\u0012\n\b\u0001\u0012\u0002\b\u0000\u0012\u0002\b\u0001\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0000',
					'',
					'',
					'\n8\n6\n\bmyPolicy\u0012 \n\u001e\b\u0000\u0012\b\u0012\u0006\b\u0001\u0012\u0002\b\u0000\u001a\u0010\b\u0000\u0012\f\n\bPeerOrg1\u0010\u0000\u0018\u0002 \u0004(\u00000\u00008\u0000'
				],
				'transientMap': null
			};
			expect(JSON.stringify(fmt_opts)).to.equal(JSON.stringify(expected));
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('fill_in_missing', () => {
		testId = 0;

		it(getId() + 'should return a success message', (done) => {
			const fake_data = {
				'status': 0,
				'statusMessage': 'all good here',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const msg = stitch.fill_in_missing(fake_data);
			expect(msg.statusMessage).to.equal('all good here');
			done();
		});

		it(getId() + 'should return an error message from "message"', (done) => {
			const fake_data = {
				'status': 0,
				'statusMessage': '',
				'headers': {},
				'message': {
					'wrappers_': {
						'4': {
							'wrappers_': null,
							'arrayIndexOffset_': -1,
							'array': [
								500,
								'error installing chaincode code fabcar:1.0.1(chaincode /data/peer/chaincodes/fabcar.1.0.1 exists)'
							],
							'pivot_': 1.7976931348623157e+308,
							'convertedFloatingPointFields_': {}
						}
					}
				}
			};
			const msg = stitch.fill_in_missing(fake_data);
			expect(msg.status).to.equal(6);
			expect(msg.statusMessage).to.equal('[bs] error installing chaincode code fabcar:1.0.1(chaincode /data/peer/chaincodes/fabcar.1.0.1 exists)');
			done();
		});

		it(getId() + 'should return an error message from code', (done) => {
			const fake_data = {
				'status': 14,
				'statusMessage': '',
				'headers': {},
				'message': {
				}
			};
			const msg = stitch.fill_in_missing(fake_data);
			expect(msg.status).to.equal(14);
			expect(msg.statusMessage).to.equal('grpc code UNAVAILABLE = (code 14) services for this operation type are currently unavailable');
			done();
		});

		it(getId() + 'should return an error message from "trailers"', (done) => {
			const fake_data = {
				'status': 0,
				'statusMessage': '',
				'headers': {},
				'message': {},
				'trailers': {
					'headersMap': {
						'grpc-message': ['some message']
					}
				}
			};
			const msg = stitch.fill_in_missing(fake_data);
			expect(msg.status).to.equal(0);
			expect(msg.statusMessage).to.equal('some message');
			done();
		});

		it(getId() + 'should return an error message from code - malformed error test', (done) => {
			const fake_data = {
				'status': 2,
				'statusMessage': '',
				'headers': {},
				'message': {},
				'trailers': {
					'headersMap': {
						'grpc-message': 'some error'
					}
				}
			};
			const msg = stitch.fill_in_missing(fake_data);
			expect(msg.status).to.equal(2);
			expect(msg.statusMessage).to.equal('grpc code UNKNOWN = (code 02) operation encountered an unknown grpc related error');
			done();
		});

		it(getId() + 'should return an error message even though code is success code', (done) => {
			const fake_data = {
				'status': 0,
				'statusMessage': 'access denied for [JoinChain][mychannel]: [Failed verifying that proposal\'s creator satisfies local MSP principal during channelless check policy with policy [Admins]: [This identity is not an admin]]',	// eslint-disable-line max-len
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const msg = stitch.fill_in_missing(fake_data);
			expect(msg.status).to.equal(7);
			expect(msg.statusMessage).to.equal(
				'[bs] access denied for [JoinChain][mychannel]: [Failed verifying that proposal\'s creator satisfies local MSP principal during channelless check policy with policy [Admins]: [This identity is not an admin]]'	// eslint-disable-line max-len
			);
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('fmt_err', () => {
		testId = 0;

		it(getId() + 'should return an error format', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				funk: 'someFunction1',
			};
			const grpc_data = {
				'status': 3,
				'statusMessage': 'something bad happened',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const stitch_msg = 'hey there buddy';
			const msg = stitch.fmt_err(input_opts, stitch.fill_in_missing(grpc_data), stitch_msg);

			const expected = {
				function_name: 'someFunction1',
				error: true,
				msp_id: 'PeerOrg1',
				stitch_msg: 'hey there buddy: something bad happened',
				grpc_resp: grpc_data,
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				_input2stitch: {
					msp_id: 'PeerOrg1',
					host: 'https://ibm.com',
					orderer_host: 'https://example.com',
					funk: 'someFunction1'
				}
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return an error format w/no grpc msg', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				funk: 'someFunction2',
			};
			const grpc_data = {
				'status': 4,
				'statusMessage': '',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const stitch_msg = 'hey there buddy2';
			const msg = stitch.fmt_err(input_opts, stitch.fill_in_missing(grpc_data), stitch_msg);

			const expected = {
				function_name: 'someFunction2',
				error: true,
				msp_id: 'PeerOrg1',
				stitch_msg: 'hey there buddy2: grpc code DEADLINE_EXCEEDED = (code 04) deadline expired before the operation could complete (timeout)',
				grpc_resp: grpc_data,
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				_input2stitch: {
					msp_id: 'PeerOrg1',
					host: 'https://ibm.com',
					orderer_host: 'https://example.com',
					funk: 'someFunction2'
				}
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return an error format w/no stitch msg', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				funk: 'someFunction3',
			};
			const grpc_data = {
				'status': 5,
				'statusMessage': 'something bad happened',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const msg = stitch.fmt_err(input_opts, stitch.fill_in_missing(grpc_data), null);

			const expected = {
				function_name: 'someFunction3',
				error: true,
				msp_id: 'PeerOrg1',
				stitch_msg: 'something bad happened',
				grpc_resp: grpc_data,
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				_input2stitch: {
					msp_id: 'PeerOrg1',
					host: 'https://ibm.com',
					orderer_host: 'https://example.com',
					funk: 'someFunction3'
				}
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return an error format from no code', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				funk: 'someFunction4',
			};
			const grpc_data = {
				'status': null,
				'statusMessage': '',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const msg = stitch.fmt_err(input_opts, stitch.fill_in_missing(grpc_data), null);

			const expected = {
				function_name: 'someFunction4',
				error: true,
				msp_id: 'PeerOrg1',
				stitch_msg: 'grpc code ??? = response contains no code or message',
				grpc_resp: grpc_data,
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				_input2stitch: {
					msp_id: 'PeerOrg1',
					host: 'https://ibm.com',
					orderer_host: 'https://example.com',
					funk: 'someFunction4'
				}
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return an error format from unknown code', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				funk: 'someFunction5',
			};
			const grpc_data = {
				'status': 99,
				'statusMessage': '',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const msg = stitch.fmt_err(input_opts, stitch.fill_in_missing(grpc_data), null);

			const expected = {
				function_name: 'someFunction5',
				error: true,
				msp_id: 'PeerOrg1',
				stitch_msg: 'grpc code ? = (code "99") response contains an unknown code',
				grpc_resp: grpc_data,
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				_input2stitch: {
					msp_id: 'PeerOrg1',
					host: 'https://ibm.com',
					orderer_host: 'https://example.com',
					funk: 'someFunction5'
				}
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});

		it(getId() + 'should return an error format w/default msg', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
			};
			const msg = stitch.fmt_err(input_opts, stitch.fill_in_missing(null), null);

			const expected = {
				error: true,
				msp_id: 'PeerOrg1',
				stitch_msg: 'yikes, somehow this error has no error message',
				grpc_resp: null,
				_input2stitch: {
					msp_id: 'PeerOrg1'
				}
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('fmt_ok', () => {
		testId = 0;

		it(getId() + 'should return an error format', (done) => {
			const input_opts = {
				msp_id: 'PeerOrg1',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				funk: 'someFunction',
			};
			const grpc_data = {
				'status': 0,
				'statusMessage': 'success',
				'headers': {},
				'message': {},
				'trailers': {}
			};
			const msg = stitch.fmt_ok(input_opts, stitch.fill_in_missing(grpc_data), { something: 'here' });

			const expected = {
				function_name: 'someFunction',
				error: false,
				msp_id: 'PeerOrg1',
				data: {
					something: 'here'
				},
				stitch_msg: 'ok',
				host: 'https://ibm.com',
				orderer_host: 'https://example.com',
				grpc_resp: grpc_data
			};
			expect(JSON.stringify(msg)).to.equal(JSON.stringify(expected));
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('signConfigUpdate', () => {
		testId = 0;

		it(getId() + 'should validate the authorization header', (done) => {
			const client_prv_key_b64pem = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tDQpNSUdIQWdFQU1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhCRzB3YXdJQkFRUWdwRCtCZWY1ZUJvNzgwMDJRDQp3aW5QR3N5SzZiMEV3bHhocTVwb3IxQy94VjJoUkFOQ0FBU1c4QXJuek5RQiswQ3hRLzB2R0JGUG5lazZpUDF1DQpJMDdxVFRzUmsrWGNObzJLYnNkMGoxcmpXUWc4RE9TWWRxeWRlRElick04VlkwTVd0NnE0MitIYQ0KLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQ0K';	// eslint-disable-line max-len
			const testBody = {
				tx_id: 'abcd',
				proposal: '<protobuf as base 64>',
				distribute: 'all',
				channel: 'first',
				orderers: ['192.168.1.0:1000'],
				orgs2sign: [
					{
						msp_id: 'org1',
						optools_url: 'http://some.athena.ibm.com:443/api/v1',
						timeout_ms: 10000,
						signature: 'dummy',
						timestamp: 0,
						admin: false
					}
				],
				orderers2sign: [{}],
				authorize: {						// this is the only important field
					msp_id: 'org1',
					certificate: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIzakNDQVlTZ0F3SUJBZ0lVYVk5TWNKeFZ4WFJ6WTJtQys5cC9ERzY4ZDRRd0NnWUlLb1pJemowRUF3SXcKV2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVFzd0NRWURWUVFERXdKallUQWVGdzB5Ck1EQTBNRFl5TURBMU1EQmFGdzB5TVRBME1EWXlNREV3TURCYU1DSXhEekFOQmdOVkJBc1RCbU5zYVdWdWRERVAKTUEwR0ExVUVBd3dHYjNKblgybGtNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVsdkFLNTh6VQpBZnRBc1VQOUx4Z1JUNTNwT29qOWJpTk82azA3RVpQbDNEYU5pbTdIZEk5YTQxa0lQQXprbUhhc25YZ3lHNnpQCkZXTkRGcmVxdU52aDJxTmdNRjR3RGdZRFZSMFBBUUgvQkFRREFnZUFNQXdHQTFVZEV3RUIvd1FDTUFBd0hRWUQKVlIwT0JCWUVGRzl4ZW1Gd2IxWENGR1dCcDBBRzhESitaUjVnTUI4R0ExVWRJd1FZTUJhQUZLbTl3QXNDVG1UYQpGRUJnMWFxcWZ5OU9wc1dXTUFvR0NDcUdTTTQ5QkFNQ0EwZ0FNRVVDSVFDMTREMTNURjA4b2pLRVVZMmVJeUh2CkJ0bTQ0enJGZlRVUmlJVXhubDlGTkFJZ0tkVnlVK2FtbkFtRlUybUd0OXZzM1JTcm0xcDUxbTlmY1VtcW8zaUIKWHJRPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',	// eslint-disable-line max-len
				},
				originator_msp: 'org1',
				json_diff: {},
				current_policy: {
					number_of_signatures: 1
				}
			};
			stitch.buildSigCollectionAuthHeader(testBody, client_prv_key_b64pem, (_, header) => {
				const jwks = stitch.pem2jwks({ pubKeyPEM: atob(testBody.authorize.certificate), prvKeyPEM: '' });

				stitch.importJwkEcdsaKey(jwks.public, (_, pubCryptoKey) => {
					const parts = header.split(' ');
					const der = stitch.base64ToUint8Array(parts[1]);
					const msg = stitch.build_sig_collection_for_hash(testBody);
					const raw_msg = stitch.utf8StrToUint8Array(msg);

					stitch.subtleVerifySignatureDer(pubCryptoKey, der, raw_msg, (_, valid) => {
						expect(valid).to.equal(true);
						done();
					});
				});
			});
		});
	});

	describe('camelCase_2_underscores', () => {
		testId = 0;

		it(getId() + 'should return json with underscores', (done) => {
			const fmt = stitch.camelCase_2_underscores({ thisIsJustATest: { meToo: false, PascalCaseLeftAlone: true } });
			expect(JSON.stringify(fmt)).to.equal(JSON.stringify({ 'this_is_just_a_test': { 'me_too': false, 'PascalCaseLeftAlone': true } }));
			done();
		});
	});

	describe('underscores_2_camelCase', () => {
		testId = 0;

		it(getId() + 'should return json with camelCase', (done) => {
			const fmt = stitch.underscores_2_camelCase({ 'this_is_just_a_test': { 'me_too': false, 'PascalCaseLeftAlone': true } });
			expect(JSON.stringify(fmt)).to.equal(JSON.stringify({ thisIsJustATest: { meToo: false, PascalCaseLeftAlone: true } }));
			done();
		});
	});

	describe('parseCertificate', () => {
		testId = 0;
		const cert_as_b64 = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlCNnpDQ0FaS2dBd0lCQWdJVVVacTIrbjgyWTZUaFNHdnFkNHpkSFJabHh0Z3dDZ1lJS29aSXpqMEVBd0l3DQphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLDQpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010DQpZMkV0YzJWeWRtVnlNQjRYRFRFNU1EWXlOakU1TVRrd01Gb1hEVEl3TURZeU5URTVNalF3TUZvd0lqRVBNQTBHDQpBMVVFQ3hNR1kyeHBaVzUwTVE4d0RRWURWUVFEREFadmNtZGZhV1F3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPDQpQUU1CQndOQ0FBUzBtQmZwUG1GSC9JUmV4enJoRVRWcFhnQ08yOU1lM1JKa3ZzTE43OG54b0VQYUM1ODhLWFQ5DQpDUmllcU1SR3JLenduWDkrWkdqQmtUbGZKRlVEVkJpcG8yQXdYakFPQmdOVkhROEJBZjhFQkFNQ0I0QXdEQVlEDQpWUjBUQVFIL0JBSXdBREFkQmdOVkhRNEVGZ1FVVC9iL3JFczJ5WUR2eGNCb0Z1eHZkUW5UMHkwd0h3WURWUjBqDQpCQmd3Rm9BVW13ckpEKytHendrMTg1M0JaelBuUlRMazNra3dDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdib1QrDQpRWm9RcWFXSmdxQmhrTDA4WUJJWU9DSFVkUUdwckp0TXpnWXB1cXdDSUVjZ3hHRGRyUlU4UytWU0xGak4zQ0lJDQpqTnVSUzZjazhiNHBxL3Z3UUQyOA0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ0K';	// eslint-disable-line max-len
		const correct_output = {
			'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI2ekNDQVpLZ0F3SUJBZ0lVVVpxMituODJZNlRoU0d2cWQ0emRIUlpseHRnd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEU1TURZeU5qRTVNVGt3TUZvWERUSXdNRFl5TlRFNU1qUXdNRm93SWpFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1ROHdEUVlEVlFRRERBWnZjbWRmYVdRd1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqTwpQUU1CQndOQ0FBUzBtQmZwUG1GSC9JUmV4enJoRVRWcFhnQ08yOU1lM1JKa3ZzTE43OG54b0VQYUM1ODhLWFQ5CkNSaWVxTVJHckt6d25YOStaR2pCa1RsZkpGVURWQmlwbzJBd1hqQU9CZ05WSFE4QkFmOEVCQU1DQjRBd0RBWUQKVlIwVEFRSC9CQUl3QURBZEJnTlZIUTRFRmdRVVQvYi9yRXMyeVlEdnhjQm9GdXh2ZFFuVDB5MHdId1lEVlIwagpCQmd3Rm9BVW13ckpEKytHendrMTg1M0JaelBuUlRMazNra3dDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdib1QrClFab1FxYVdKZ3FCaGtMMDhZQklZT0NIVWRRR3BySnRNemdZcHVxd0NJRWNneEdEZHJSVThTK1ZTTEZqTjNDSUkKak51UlM2Y2s4YjRwcS92d1FEMjgKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',	// eslint-disable-line max-len
			'issuer': '/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=fabric-ca-server',
			'not_after_ts': 1593113040000,
			'not_before_ts': 1561576740000,
			'serial_number_hex': '519ab6fa7f3663a4e1486bea778cdd1d1665c6d8',
			'signature_algorithm': 'SHA256withECDSA',
			'subject': '/OU=client/CN=org_id',
			'subject_alt_names': null,
			'subject_parsed': 'OU=client, CN=org_id',
			'subject_parts': {
				'CN': 'org_id',
				'OU': 'client'
			},
			//'time_left': '265.9 days',
			'X509_version': 3
		};
		const correct_output2 = {
			'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURPekNDQWlPZ0F3SUJBZ0lKZUlNNWhzZWk3cE5PTUEwR0NTcUdTSWIzRFFFQkN3VUFNRkF4RWpBUUJnTlYKQkFNVENXeHZZMkZzYUc5emRERVdNQlFHQTFVRUNoTU5hV0p3TWkxaGRYUnZMV2RsYmpFaU1DQUdDU3FHU0liMwpEUUVKQVJNVFpDb3FLaW9xS21GQWRYTXVhV0p0TG1OdmJUQWVGdzB4T1RBNU1qVXhNekV6TXpsYUZ3MHlOREE1Ck1qTXhNekV6TXpsYU1GQXhFakFRQmdOVkJBTVRDV3h2WTJGc2FHOXpkREVXTUJRR0ExVUVDaE1OYVdKd01pMWgKZFhSdkxXZGxiakVpTUNBR0NTcUdTSWIzRFFFSkFSTVRaQ29xS2lvcUttRkFkWE11YVdKdExtTnZiVENDQVNJdwpEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTFlsVGJlWkkrNVJtWUlkTmxoNjBvM0EvZzlqCnFodit1Qm1jVUQxVU8xZzdvcHhTMTducWVzZ0hxVlVQOXArZGFEalozdDVLbnRnRFFBRExMZ0c4WFVhTUZtcTEKWFRNRnNQYUUzU3ZQUFBiaWwzazlVVVpMMHFHZlNvaWlPZFlCZi96Z0tNTjNuRTNWdGVKQ0tyTExXUVoyWHVaawpERmQyL29qVTlVdFJwL1V2UHh5NEpYRkZITE03Nkk2allYQmZJd2hMYThjYUlVTUgrbmhybVByeDJ0TWxaVnBUCnN2TEZwcEZOU1BpSmJYS2FreDBVQWZuZnVicVpta3ZhdnRxZkRneGd0R1ZXRk9BYVh1QWtsOW9hdnlrYjM1cGUKK3F4RkJlaDBaeTN2dHdHbDhGYWx3bVBDcnBkUGFqQmpyaFNKTXZtU0VxQ0t5ZUxRYnVoZUdvemEwUDhDQXdFQQpBYU1ZTUJZd0ZBWURWUjBSQkEwd0M0SUpiRzlqWVd4b2IzTjBNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUNHCjlqM1pQU0l3TWx4MDJKeGV3T1ZuU1lXRk8rNEpvalV0bUdnSElHbklXR1JyMU8vWjRvTU5scUpsbkNjY3lQK2MKM0p0ZVFSVTRVY01RTzlhWm9Ca3J0bjAvQUZ1b1E1M2E0ZElxQk52YVRuc21IT0wyUzZrTHZKU0ZNTE84V1dtVQpDL24rMW9aMzhaQUJhVG9SZ1NKc3k0UFNZV0xHS1V1a084dWwrOENWMVFFL3pQWFZBWjEzcjZpQjZDQkFNUVBNCjBPejdIc2dqNGpZV0JMRExodENNeGg0VkltN1FVWndyZzdyMkU2Z2pnYWRFUUM2L052Tm4rOWk0ZmQrQ25USWYKd29yVTVIcTBXUDllRnRoSGdjN2FaQjVZUUpndHR2WGR4eHpvajRmTGhjeXY2WHJRSWpZbzdldUtiWFNpTGVQMwpaRDlkV0VaNUVUUzhNMFdIMlRkYwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',	// eslint-disable-line max-len
			'issuer': '/CN=localhost/O=ibp2-auto-gen/E=d******a@us.ibm.com',
			'not_after_ts': 1727097219000,
			'not_before_ts': 1569417219000,
			'serial_number_hex': '78833986c7a2ee934e',
			'signature_algorithm': 'SHA256withRSA',
			'subject': '/CN=localhost/O=ibp2-auto-gen/E=d******a@us.ibm.com',
			'subject_alt_names': [
				'DNS',
				'localhost'
			],
			'subject_parsed': 'CN=localhost, O=ibp2-auto-gen, E=d******a@us.ibm.com',
			'subject_parts': {
				'CN': 'localhost',
				'E': 'd******a@us.ibm.com',
				'O': 'ibp2-auto-gen'
			},
			//'time_left': '1816.7 days',
			'X509_version': 3
		};

		it(getId() + 'should return parsed certificate given b64 pem', (done) => {
			const parsed = stitch.parseCertificate(cert_as_b64);
			delete parsed.time_left;
			expect(parsed).to.deep.equal(correct_output);
			done();
		});

		it(getId() + 'should return parsed certificate given pem', (done) => {
			const cert = atob(cert_as_b64);
			const parsed = stitch.parseCertificate(cert);
			delete parsed.time_left;
			expect(parsed).to.deep.equal(correct_output);
			done();
		});

		it(getId() + 'should return parsed certificate w/ subject alt names', (done) => {
			const cert = `-----BEGIN CERTIFICATE-----
			MIIDOzCCAiOgAwIBAgIJeIM5hsei7pNOMA0GCSqGSIb3DQEBCwUAMFAxEjAQBgNV
			BAMTCWxvY2FsaG9zdDEWMBQGA1UEChMNaWJwMi1hdXRvLWdlbjEiMCAGCSqGSIb3
			DQEJARMTZCoqKioqKmFAdXMuaWJtLmNvbTAeFw0xOTA5MjUxMzEzMzlaFw0yNDA5
			MjMxMzEzMzlaMFAxEjAQBgNVBAMTCWxvY2FsaG9zdDEWMBQGA1UEChMNaWJwMi1h
			dXRvLWdlbjEiMCAGCSqGSIb3DQEJARMTZCoqKioqKmFAdXMuaWJtLmNvbTCCASIw
			DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALYlTbeZI+5RmYIdNlh60o3A/g9j
			qhv+uBmcUD1UO1g7opxS17nqesgHqVUP9p+daDjZ3t5KntgDQADLLgG8XUaMFmq1
			XTMFsPaE3SvPPPbil3k9UUZL0qGfSoiiOdYBf/zgKMN3nE3VteJCKrLLWQZ2XuZk
			DFd2/ojU9UtRp/UvPxy4JXFFHLM76I6jYXBfIwhLa8caIUMH+nhrmPrx2tMlZVpT
			svLFppFNSPiJbXKakx0UAfnfubqZmkvavtqfDgxgtGVWFOAaXuAkl9oavykb35pe
			+qxFBeh0Zy3vtwGl8FalwmPCrpdPajBjrhSJMvmSEqCKyeLQbuheGoza0P8CAwEA
			AaMYMBYwFAYDVR0RBA0wC4IJbG9jYWxob3N0MA0GCSqGSIb3DQEBCwUAA4IBAQCG
			9j3ZPSIwMlx02JxewOVnSYWFO+4JojUtmGgHIGnIWGRr1O/Z4oMNlqJlnCccyP+c
			3JteQRU4UcMQO9aZoBkrtn0/AFuoQ53a4dIqBNvaTnsmHOL2S6kLvJSFMLO8WWmU
			C/n+1oZ38ZABaToRgSJsy4PSYWLGKUukO8ul+8CV1QE/zPXVAZ13r6iB6CBAMQPM
			0Oz7Hsgj4jYWBLDLhtCMxh4VIm7QUZwrg7r2E6gjgadEQC6/NvNn+9i4fd+CnTIf
			worU5Hq0WP9eFthHgc7aZB5YQJgttvXdxxzoj4fLhcyv6XrQIjYo7euKbXSiLeP3
			ZD9dWEZ5ETS8M0WH2Tdc
			-----END CERTIFICATE-----`;
			const parsed = stitch.parseCertificate(cert);
			delete parsed.time_left;
			expect(parsed).to.deep.equal(correct_output2);
			done();
		});

		it(getId() + 'should return parsed certificate (weird white space)', (done) => {
			const cert = `-----BEGIN CERTIFICATE-----
			MIIDOzCCAiOgAwIBAgIJeIM5hsei7pNOMA0GCSqGSIb3DQEBCwUAMFAxEjAQBgNV
			BAMTCWxvY2FsaG9zdDEWMBQGA1UEChMNaWJwMi1hdXRvLWdlbjEiMCAGCSqGSIb3
			DQEJARMTZCoqKioqKmFAdXMuaWJtLmNvbTAeFw0xOTA5MjUxMzEzMzlaFw0yNDA5

			MjMxMzEzMzlaMFAxEjAQBgNVBAMTCWxvY2FsaG9zdDEWMBQGA1UEChMNaWJwMi1h

			dXRvLWdlbjEiMCAGCSqGSIb3DQEJARMTZCoqKioqKmFAdXMuaWJtLmNvbTCCASIw

			DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALYlTbeZI+5RmYIdNlh60o3A/g9j

			qhv+uBmcUD1UO1g7opxS17nqesgHqVUP9p+daDjZ3t5KntgDQADLLgG8XUaMFmq1
			XTMFsPaE3SvPPPbil3k9UUZL0qGfSoiiOdYBf/zgKMN3nE3VteJCKrLLWQZ2XuZk
			DFd2/ojU9UtRp/UvPxy4JXFFHLM76I6jYXBfIwhLa8caIUMH+nhrmPrx2tMlZVpT
			svLFppFNSPiJbXKakx0UAfnfubqZmkvavtqfDgxgtGVWFOAaXuAkl9oavykb35pe

			+qxFBeh0Zy3vtwGl8FalwmPCrpdPajBjrhSJMvmSEqCKyeLQbuheGoza0P8CAwEA
			AaMYMBYwFAYDVR0RBA0wC4IJbG9jYWxob3N0MA0GCSqGSIb3DQEBCwUAA4IBAQCG




			9j3ZPSIwMlx02JxewOVnSYWFO+4JojUtmGgHIGnIWGRr1O/Z4oMNlqJlnCccyP+c
			3JteQRU4UcMQO9aZoBkrtn0/AFuoQ53a4dIqBNvaTnsmHOL2S6kLvJSFMLO8WWmU
			C/n+1oZ38ZABaToRgSJsy4PSYWLGKUukO8ul+8CV1QE/zPXVAZ13r6iB6CBAMQPM
			0Oz7Hsgj4jYWBLDLhtCMxh4VIm7QUZwrg7r2E6gjgadEQC6/NvNn+9i4fd+CnTIf
			worU5Hq0WP9eFthHgc7aZB5YQJgttvXdxxzoj4fLhcyv6XrQIjYo7euKbXSiLeP3
			ZD9dWEZ5ETS8M0WH2Tdc
			-----END CERTIFICATE-----`;
			const parsed = stitch.parseCertificate(cert);
			delete parsed.time_left;
			expect(parsed).to.deep.equal(correct_output2);
			done();
		});


		it(getId() + 'should return parsed certificate w/json attrs', (done) => {
			const parsed = stitch.parseCertificate(`-----BEGIN CERTIFICATE-----
			MIICeDCCAh6gAwIBAgIUUrTY3xRm3YqC/GnXKSskVBuub6EwCgYIKoZIzj0EAwIw
			aDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK
			EwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt
			Y2Etc2VydmVyMB4XDTE5MTAwMzE5MDkwMFoXDTIwMTAwMjE5MTQwMFowQjEuMAsG
			A1UECxMEcGVlcjALBgNVBAsTBG9yZzEwEgYDVQQLEwtkZXBhcnRtZW50MjEQMA4G
			A1UEAxMHbXl1c2VyMTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABDXOvpSXJpJU
			XvW4tCL/jZjdw+e3Lp27BIPntVT4+aMtmOcuYomG87jcWESrIegJr5vHqidig5aq
			S72+lM6JfPWjgcswgcgwDgYDVR0PAQH/BAQDAgeAMAwGA1UdEwEB/wQCMAAwHQYD
			VR0OBBYEFBY+nE+gU8nKc1hlWJ1WFN4RwhV2MB8GA1UdIwQYMBaAFGSKGUkDEJyK
			r4F6hKqmOhHZV4K9MGgGCCoDBAUGBwgBBFx7ImF0dHJzIjp7ImhmLkFmZmlsaWF0
			aW9uIjoib3JnMS5kZXBhcnRtZW50MiIsImhmLkVucm9sbG1lbnRJRCI6Im15dXNl
			cjEiLCJoZi5UeXBlIjoicGVlciJ9fTAKBggqhkjOPQQDAgNIADBFAiEAsLP+yjpw
			hJ6/fWK80kN8GzhJSZCo0i1pbaqfOOzUhgQCIC+qVZFLP/XbkRsCxmFa3f4Joo7x
			MNHZtjDJhYBeau1W
			-----END CERTIFICATE-----`);
			delete parsed.time_left;
			expect(parsed).to.deep.equal({
				'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNlRENDQWg2Z0F3SUJBZ0lVVXJUWTN4Um0zWXFDL0duWEtTc2tWQnV1YjZFd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEU1TVRBd016RTVNRGt3TUZvWERUSXdNVEF3TWpFNU1UUXdNRm93UWpFdU1Bc0cKQTFVRUN4TUVjR1ZsY2pBTEJnTlZCQXNUQkc5eVp6RXdFZ1lEVlFRTEV3dGtaWEJoY25SdFpXNTBNakVRTUE0RwpBMVVFQXhNSGJYbDFjMlZ5TVRCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhBMElBQkRYT3ZwU1hKcEpVClh2VzR0Q0wvalpqZHcrZTNMcDI3QklQbnRWVDQrYU10bU9jdVlvbUc4N2pjV0VTckllZ0pyNXZIcWlkaWc1YXEKUzcyK2xNNkpmUFdqZ2Nzd2djZ3dEZ1lEVlIwUEFRSC9CQVFEQWdlQU1Bd0dBMVVkRXdFQi93UUNNQUF3SFFZRApWUjBPQkJZRUZCWStuRStnVThuS2MxaGxXSjFXRk40UndoVjJNQjhHQTFVZEl3UVlNQmFBRkdTS0dVa0RFSnlLCnI0RjZoS3FtT2hIWlY0SzlNR2dHQ0NvREJBVUdCd2dCQkZ4N0ltRjBkSEp6SWpwN0ltaG1Ma0ZtWm1sc2FXRjAKYVc5dUlqb2liM0puTVM1a1pYQmhjblJ0Wlc1ME1pSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbTE1ZFhObApjakVpTENKb1ppNVVlWEJsSWpvaWNHVmxjaUo5ZlRBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlFQXNMUCt5anB3CmhKNi9mV0s4MGtOOEd6aEpTWkNvMGkxcGJhcWZPT3pVaGdRQ0lDK3FWWkZMUC9YYmtSc0N4bUZhM2Y0Sm9vN3gKTU5IWnRqREpoWUJlYXUxVwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',	// eslint-disable-line max-len
				'issuer': '/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=fabric-ca-server',
				'not_after_ts': 1601666040000,
				'not_before_ts': 1570129740000,
				'recovered_json': {
					'attrs': {
						'hf.Affiliation': 'org1.department2',
						'hf.EnrollmentID': 'myuser1',
						'hf.Type': 'peer'
					}
				},
				'serial_number_hex': '52b4d8df1466dd8a82fc69d7292b24541bae6fa1',
				'signature_algorithm': 'SHA256withECDSA',
				'subject': '/OU=peer+OU=org1+OU=department2/CN=myuser1',
				'subject_alt_names': null,
				'subject_parsed': 'OU=peer, OU=org1, OU=department2, CN=myuser1',
				'subject_parts': {
					'CN': 'myuser1',
					'OU': [
						'department2',
						'org1',
						'peer'
					]
				},
				//'time_left': '364.9 days',
				'X509_version': 3
			});
			done();
		});

		it(getId() + 'should return parse normal identity certificate', (done) => {
			const parsed = stitch.parseCertificate('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIzRENDQVlLZ0F3SUJBZ0lVVzlTU1JCWEU2RFlneFZMMkdmMHU2MnlYemtRd0NnWUlLb1pJemowRUF3SXcKV2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVFzd0NRWURWUVFERXdKallUQWVGdzB5Ck1EQXpNak14TXpFNU1EQmFGdzB5TVRBek1qTXhNekkwTURCYU1DQXhEekFOQmdOVkJBc1RCbU5zYVdWdWRERU4KTUFzR0ExVUVBeE1FZEdWemREQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJKUWpUcnNzWVpGMgpJQVhkem1VVWJKM3pwZ2ZySFdlM1lKeEFZaTNSQzdSTzIwVHBmT2cxZjNRUzhRREpJMElqMm5MeHVoV3lURmpyCnp6UDArSFVqZ2tXallEQmVNQTRHQTFVZER3RUIvd1FFQXdJSGdEQU1CZ05WSFJNQkFmOEVBakFBTUIwR0ExVWQKRGdRV0JCVGpuK0pRMHhhTDNMK0ZyWDBCMmJudlVZVmYvREFmQmdOVkhTTUVHREFXZ0JTZXpRc0k5dTJNM082egorMlhyK0lwdDJydG40ekFLQmdncWhrak9QUVFEQWdOSUFEQkZBaUVBemp2REpqMFVveVk2d0FtaDZyN3VNcVRwCjJ4QTZNYkRhR0RmWHNuOUVwakVDSURLQ2kwWXBCNS8yQXVZTnFqRFJCNEZSQmVJbDE1cEJkVGxGdDdsVE5tV3AKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=');	// eslint-disable-line max-len
			delete parsed.time_left;
			expect(parsed).to.deep.equal({
				'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUIzRENDQVlLZ0F3SUJBZ0lVVzlTU1JCWEU2RFlneFZMMkdmMHU2MnlYemtRd0NnWUlLb1pJemowRUF3SXcKV2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVFzd0NRWURWUVFERXdKallUQWVGdzB5Ck1EQXpNak14TXpFNU1EQmFGdzB5TVRBek1qTXhNekkwTURCYU1DQXhEekFOQmdOVkJBc1RCbU5zYVdWdWRERU4KTUFzR0ExVUVBeE1FZEdWemREQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJKUWpUcnNzWVpGMgpJQVhkem1VVWJKM3pwZ2ZySFdlM1lKeEFZaTNSQzdSTzIwVHBmT2cxZjNRUzhRREpJMElqMm5MeHVoV3lURmpyCnp6UDArSFVqZ2tXallEQmVNQTRHQTFVZER3RUIvd1FFQXdJSGdEQU1CZ05WSFJNQkFmOEVBakFBTUIwR0ExVWQKRGdRV0JCVGpuK0pRMHhhTDNMK0ZyWDBCMmJudlVZVmYvREFmQmdOVkhTTUVHREFXZ0JTZXpRc0k5dTJNM082egorMlhyK0lwdDJydG40ekFLQmdncWhrak9QUVFEQWdOSUFEQkZBaUVBemp2REpqMFVveVk2d0FtaDZyN3VNcVRwCjJ4QTZNYkRhR0RmWHNuOUVwakVDSURLQ2kwWXBCNS8yQXVZTnFqRFJCNEZSQmVJbDE1cEJkVGxGdDdsVE5tV3AKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',	// eslint-disable-line max-len
				'issuer': '/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=ca',
				'not_after_ts': 1616505840000,
				'not_before_ts': 1584969540000,
				'serial_number_hex': '5bd4924415c4e83620c552f619fd2eeb6c97ce44',
				'signature_algorithm': 'SHA256withECDSA',
				'subject': '/OU=client/CN=test',
				'subject_alt_names': null,
				'subject_parsed': 'OU=client, CN=test',
				'subject_parts': {
					'CN': 'test',
					'OU': 'client'
				},
				//'time_left': '313.5 days',
				'X509_version': 3
			});
			done();
		});

		it(getId() + 'should return parse tls cert w/alt names', (done) => {
			const parsed = stitch.parseCertificate(`-----BEGIN CERTIFICATE-----
			MIICnzCCAkWgAwIBAgIQV/JAeVkzfMCHFl8q/n0hNjAKBggqhkjOPQQDAjCBpzEL
			MAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQHEwZE
			dXJoYW0xDDAKBgNVBAoTA0lCTTETMBEGA1UECxMKQmxvY2tjaGFpbjFLMEkGA1UE
			AxNCbmYyNTE0YS1jYTEuaWJwdjItdGVzdC1jbHVzdGVyLnVzLXNvdXRoLmNvbnRh
			aW5lcnMuYXBwZG9tYWluLmNsb3VkMB4XDTIwMDQxNDE0MTUwMFoXDTMwMDQxMjE0
			MTUwMFowgacxCzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEP
			MA0GA1UEBxMGRHVyaGFtMQwwCgYDVQQKEwNJQk0xEzARBgNVBAsTCkJsb2NrY2hh
			aW4xSzBJBgNVBAMTQm5mMjUxNGEtY2ExLmlicHYyLXRlc3QtY2x1c3Rlci51cy1z
			b3V0aC5jb250YWluZXJzLmFwcGRvbWFpbi5jbG91ZDBZMBMGByqGSM49AgEGCCqG
			SM49AwEHA0IABJu7ftdVgZM7J7w590TXnC68vukyCwfav4VQsU8aCwAWBR+EMsGJ
			qOhZk1BsPaNIKrsDzb/f47BOK1w86gjKdmqjUTBPME0GA1UdEQRGMESCQm5mMjUx
			NGEtY2ExLmlicHYyLXRlc3QtY2x1c3Rlci51cy1zb3V0aC5jb250YWluZXJzLmFw
			cGRvbWFpbi5jbG91ZDAKBggqhkjOPQQDAgNIADBFAiBKgwp65SDGZ7mxHxR6fI98
			ombGk5juK/V/qGfM/oIQUQIhAP8hQjuITzxUyJtYCh71zc5XtcqgzvAdZNK1JhVa
			sibE
			-----END CERTIFICATE-----`);
			delete parsed.time_left;
			expect(parsed).to.deep.equal({
				'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNuekNDQWtXZ0F3SUJBZ0lRVi9KQWVWa3pmTUNIRmw4cS9uMGhOakFLQmdncWhrak9QUVFEQWpDQnB6RUwKTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVE4d0RRWURWUVFIRXdaRQpkWEpvWVcweEREQUtCZ05WQkFvVEEwbENUVEVUTUJFR0ExVUVDeE1LUW14dlkydGphR0ZwYmpGTE1Fa0dBMVVFCkF4TkNibVl5TlRFMFlTMWpZVEV1YVdKd2RqSXRkR1Z6ZEMxamJIVnpkR1Z5TG5WekxYTnZkWFJvTG1OdmJuUmgKYVc1bGNuTXVZWEJ3Wkc5dFlXbHVMbU5zYjNWa01CNFhEVEl3TURReE5ERTBNVFV3TUZvWERUTXdNRFF4TWpFMApNVFV3TUZvd2dhY3hDekFKQmdOVkJBWVRBbFZUTVJjd0ZRWURWUVFJRXc1T2IzSjBhQ0JEWVhKdmJHbHVZVEVQCk1BMEdBMVVFQnhNR1JIVnlhR0Z0TVF3d0NnWURWUVFLRXdOSlFrMHhFekFSQmdOVkJBc1RDa0pzYjJOclkyaGgKYVc0eFN6QkpCZ05WQkFNVFFtNW1NalV4TkdFdFkyRXhMbWxpY0hZeUxYUmxjM1F0WTJ4MWMzUmxjaTUxY3kxegpiM1YwYUM1amIyNTBZV2x1WlhKekxtRndjR1J2YldGcGJpNWpiRzkxWkRCWk1CTUdCeXFHU000OUFnRUdDQ3FHClNNNDlBd0VIQTBJQUJKdTdmdGRWZ1pNN0o3dzU5MFRYbkM2OHZ1a3lDd2ZhdjRWUXNVOGFDd0FXQlIrRU1zR0oKcU9oWmsxQnNQYU5JS3JzRHpiL2Y0N0JPSzF3ODZnaktkbXFqVVRCUE1FMEdBMVVkRVFSR01FU0NRbTVtTWpVeApOR0V0WTJFeExtbGljSFl5TFhSbGMzUXRZMngxYzNSbGNpNTFjeTF6YjNWMGFDNWpiMjUwWVdsdVpYSnpMbUZ3CmNHUnZiV0ZwYmk1amJHOTFaREFLQmdncWhrak9QUVFEQWdOSUFEQkZBaUJLZ3dwNjVTREdaN214SHhSNmZJOTgKb21iR2s1anVLL1YvcUdmTS9vSVFVUUloQVA4aFFqdUlUenhVeUp0WUNoNzF6YzVYdGNxZ3p2QWRaTksxSmhWYQpzaWJFCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',	// eslint-disable-line max-len
				'issuer': '/C=US/ST=North Carolina/L=Durham/O=IBM/OU=Blockchain/CN=nf2514a-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud',
				'not_after_ts': 1902233700000,
				'not_before_ts': 1586873700000,
				'serial_number_hex': '57f2407959337cc087165f2afe7d2136',
				'signature_algorithm': 'SHA256withECDSA',
				'subject': '/C=US/ST=North Carolina/L=Durham/O=IBM/OU=Blockchain/CN=nf2514a-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud',
				'subject_alt_names': [
					'DNS',
					'nf2514a-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud'
				],
				'subject_parsed': 'C=US, ST=North Carolina, L=Durham, O=IBM, OU=Blockchain, CN=nf2514a-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud',	// eslint-disable-line max-len
				'subject_parts': {
					'C': 'US',
					'CN': 'nf2514a-ca1.ibpv2-test-cluster.us-south.containers.appdomain.cloud',
					'L': 'Durham',
					'O': 'IBM',
					'OU': 'Blockchain',
					'ST': 'North Carolina'
				},
				//'time_left': '3620.6 days',
				'X509_version': 3
			});
			done();
		});

		it(getId() + 'should return parse normal identity certificate w/utf8 client OU format', (done) => {
			const parsed = stitch.parseCertificate('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlCNnpDQ0FaS2dBd0lCQWdJVVVacTIrbjgyWTZUaFNHdnFkNHpkSFJabHh0Z3dDZ1lJS29aSXpqMEVBd0l3DQphREVMTUFrR0ExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLDQpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010DQpZMkV0YzJWeWRtVnlNQjRYRFRFNU1EWXlOakU1TVRrd01Gb1hEVEl3TURZeU5URTVNalF3TUZvd0lqRVBNQTBHDQpBMVVFQ3hNR1kyeHBaVzUwTVE4d0RRWURWUVFEREFadmNtZGZhV1F3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPDQpQUU1CQndOQ0FBUzBtQmZwUG1GSC9JUmV4enJoRVRWcFhnQ08yOU1lM1JKa3ZzTE43OG54b0VQYUM1ODhLWFQ5DQpDUmllcU1SR3JLenduWDkrWkdqQmtUbGZKRlVEVkJpcG8yQXdYakFPQmdOVkhROEJBZjhFQkFNQ0I0QXdEQVlEDQpWUjBUQVFIL0JBSXdBREFkQmdOVkhRNEVGZ1FVVC9iL3JFczJ5WUR2eGNCb0Z1eHZkUW5UMHkwd0h3WURWUjBqDQpCQmd3Rm9BVW13ckpEKytHendrMTg1M0JaelBuUlRMazNra3dDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdib1QrDQpRWm9RcWFXSmdxQmhrTDA4WUJJWU9DSFVkUUdwckp0TXpnWXB1cXdDSUVjZ3hHRGRyUlU4UytWU0xGak4zQ0lJDQpqTnVSUzZjazhiNHBxL3Z3UUQyOA0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ0K');	// eslint-disable-line max-len
			delete parsed.time_left;
			expect(parsed).to.deep.equal({
				'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI2ekNDQVpLZ0F3SUJBZ0lVVVpxMituODJZNlRoU0d2cWQ0emRIUlpseHRnd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEU1TURZeU5qRTVNVGt3TUZvWERUSXdNRFl5TlRFNU1qUXdNRm93SWpFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1ROHdEUVlEVlFRRERBWnZjbWRmYVdRd1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqTwpQUU1CQndOQ0FBUzBtQmZwUG1GSC9JUmV4enJoRVRWcFhnQ08yOU1lM1JKa3ZzTE43OG54b0VQYUM1ODhLWFQ5CkNSaWVxTVJHckt6d25YOStaR2pCa1RsZkpGVURWQmlwbzJBd1hqQU9CZ05WSFE4QkFmOEVCQU1DQjRBd0RBWUQKVlIwVEFRSC9CQUl3QURBZEJnTlZIUTRFRmdRVVQvYi9yRXMyeVlEdnhjQm9GdXh2ZFFuVDB5MHdId1lEVlIwagpCQmd3Rm9BVW13ckpEKytHendrMTg1M0JaelBuUlRMazNra3dDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdib1QrClFab1FxYVdKZ3FCaGtMMDhZQklZT0NIVWRRR3BySnRNemdZcHVxd0NJRWNneEdEZHJSVThTK1ZTTEZqTjNDSUkKak51UlM2Y2s4YjRwcS92d1FEMjgKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',	// eslint-disable-line max-len
				'issuer': '/C=US/ST=North Carolina/O=Hyperledger/OU=Fabric/CN=fabric-ca-server',
				'not_after_ts': 1593113040000,
				'not_before_ts': 1561576740000,
				'serial_number_hex': '519ab6fa7f3663a4e1486bea778cdd1d1665c6d8',
				'signature_algorithm': 'SHA256withECDSA',
				'subject': '/OU=client/CN=org_id',
				'subject_alt_names': null,
				'subject_parsed': 'OU=client, CN=org_id',
				'subject_parts': {
					'CN': 'org_id',
					'OU': 'client'
				},
				//'time_left': '42.8 days',
				'X509_version': 3
			});
			done();
		});

		it(getId() + 'should return tls cert w/ weird null values', (done) => {
			const parsed = stitch.parseCertificate(`-----BEGIN CERTIFICATE-----
			MIIDOzCCAiOgAwIBAgIJeIM5hsei7pNOMA0GCSqGSIb3DQEBCwUAMFAxEjAQBgNV
			BAMTCWxvY2FsaG9zdDEWMBQGA1UEChMNaWJwMi1hdXRvLWdlbjEiMCAGCSqGSIb3
			DQEJARMTZCoqKioqKmFAdXMuaWJtLmNvbTAeFw0xOTA5MjUxMzEzMzlaFw0yNDA5
			MjMxMzEzMzlaMFAxEjAQBgNVBAMTCWxvY2FsaG9zdDEWMBQGA1UEChMNaWJwMi1h
			dXRvLWdlbjEiMCAGCSqGSIb3DQEJARMTZCoqKioqKmFAdXMuaWJtLmNvbTCCASIw
			DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALYlTbeZI+5RmYIdNlh60o3A/g9j
			qhv+uBmcUD1UO1g7opxS17nqesgHqVUP9p+daDjZ3t5KntgDQADLLgG8XUaMFmq1
			XTMFsPaE3SvPPPbil3k9UUZL0qGfSoiiOdYBf/zgKMN3nE3VteJCKrLLWQZ2XuZk
			DFd2/ojU9UtRp/UvPxy4JXFFHLM76I6jYXBfIwhLa8caIUMH+nhrmPrx2tMlZVpT
			svLFppFNSPiJbXKakx0UAfnfubqZmkvavtqfDgxgtGVWFOAaXuAkl9oavykb35pe
			+qxFBeh0Zy3vtwGl8FalwmPCrpdPajBjrhSJMvmSEqCKyeLQbuheGoza0P8CAwEA
			AaMYMBYwFAYDVR0RBA0wC4IJbG9jYWxob3N0MA0GCSqGSIb3DQEBCwUAA4IBAQCG
			9j3ZPSIwMlx02JxewOVnSYWFO+4JojUtmGgHIGnIWGRr1O/Z4oMNlqJlnCccyP+c
			3JteQRU4UcMQO9aZoBkrtn0/AFuoQ53a4dIqBNvaTnsmHOL2S6kLvJSFMLO8WWmU
			C/n+1oZ38ZABaToRgSJsy4PSYWLGKUukO8ul+8CV1QE/zPXVAZ13r6iB6CBAMQPM
			0Oz7Hsgj4jYWBLDLhtCMxh4VIm7QUZwrg7r2E6gjgadEQC6/NvNn+9i4fd+CnTIf
			worU5Hq0WP9eFthHgc7aZB5YQJgttvXdxxzoj4fLhcyv6XrQIjYo7euKbXSiLeP3
			ZD9dWEZ5ETS8M0WH2Tdc
			-----END CERTIFICATE-----`);
			delete parsed.time_left;
			expect(parsed).to.deep.equal({
				'base_64_pem': 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURPekNDQWlPZ0F3SUJBZ0lKZUlNNWhzZWk3cE5PTUEwR0NTcUdTSWIzRFFFQkN3VUFNRkF4RWpBUUJnTlYKQkFNVENXeHZZMkZzYUc5emRERVdNQlFHQTFVRUNoTU5hV0p3TWkxaGRYUnZMV2RsYmpFaU1DQUdDU3FHU0liMwpEUUVKQVJNVFpDb3FLaW9xS21GQWRYTXVhV0p0TG1OdmJUQWVGdzB4T1RBNU1qVXhNekV6TXpsYUZ3MHlOREE1Ck1qTXhNekV6TXpsYU1GQXhFakFRQmdOVkJBTVRDV3h2WTJGc2FHOXpkREVXTUJRR0ExVUVDaE1OYVdKd01pMWgKZFhSdkxXZGxiakVpTUNBR0NTcUdTSWIzRFFFSkFSTVRaQ29xS2lvcUttRkFkWE11YVdKdExtTnZiVENDQVNJdwpEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTFlsVGJlWkkrNVJtWUlkTmxoNjBvM0EvZzlqCnFodit1Qm1jVUQxVU8xZzdvcHhTMTducWVzZ0hxVlVQOXArZGFEalozdDVLbnRnRFFBRExMZ0c4WFVhTUZtcTEKWFRNRnNQYUUzU3ZQUFBiaWwzazlVVVpMMHFHZlNvaWlPZFlCZi96Z0tNTjNuRTNWdGVKQ0tyTExXUVoyWHVaawpERmQyL29qVTlVdFJwL1V2UHh5NEpYRkZITE03Nkk2allYQmZJd2hMYThjYUlVTUgrbmhybVByeDJ0TWxaVnBUCnN2TEZwcEZOU1BpSmJYS2FreDBVQWZuZnVicVpta3ZhdnRxZkRneGd0R1ZXRk9BYVh1QWtsOW9hdnlrYjM1cGUKK3F4RkJlaDBaeTN2dHdHbDhGYWx3bVBDcnBkUGFqQmpyaFNKTXZtU0VxQ0t5ZUxRYnVoZUdvemEwUDhDQXdFQQpBYU1ZTUJZd0ZBWURWUjBSQkEwd0M0SUpiRzlqWVd4b2IzTjBNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUNHCjlqM1pQU0l3TWx4MDJKeGV3T1ZuU1lXRk8rNEpvalV0bUdnSElHbklXR1JyMU8vWjRvTU5scUpsbkNjY3lQK2MKM0p0ZVFSVTRVY01RTzlhWm9Ca3J0bjAvQUZ1b1E1M2E0ZElxQk52YVRuc21IT0wyUzZrTHZKU0ZNTE84V1dtVQpDL24rMW9aMzhaQUJhVG9SZ1NKc3k0UFNZV0xHS1V1a084dWwrOENWMVFFL3pQWFZBWjEzcjZpQjZDQkFNUVBNCjBPejdIc2dqNGpZV0JMRExodENNeGg0VkltN1FVWndyZzdyMkU2Z2pnYWRFUUM2L052Tm4rOWk0ZmQrQ25USWYKd29yVTVIcTBXUDllRnRoSGdjN2FaQjVZUUpndHR2WGR4eHpvajRmTGhjeXY2WHJRSWpZbzdldUtiWFNpTGVQMwpaRDlkV0VaNUVUUzhNMFdIMlRkYwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',	// eslint-disable-line max-len
				'issuer': '/CN=localhost/O=ibp2-auto-gen/E=d******a@us.ibm.com',
				'not_after_ts': 1727097219000,
				'not_before_ts': 1569417219000,
				'serial_number_hex': '78833986c7a2ee934e',
				'signature_algorithm': 'SHA256withRSA',
				'subject': '/CN=localhost/O=ibp2-auto-gen/E=d******a@us.ibm.com',
				'subject_alt_names': [
					'DNS',
					'localhost'
				],
				'subject_parsed': 'CN=localhost, O=ibp2-auto-gen, E=d******a@us.ibm.com',
				'subject_parts': {
					'CN': 'localhost',
					'E': 'd******a@us.ibm.com',
					'O': 'ibp2-auto-gen'
				},
				//'time_left': '1593.5 days',
				'X509_version': 3
			});
			done();
		});
	});

	describe('setTimeouts & getTimeouts', () => {
		testId = 0;

		it(getId() + 'should take the new timeouts', (done) => {
			let timeouts = stitch.setTimeouts({ fabric_get_block_timeout_ms: 1 });
			expect(timeouts.fabric_get_block_timeout_ms).to.equal(1);

			timeouts = stitch.setTimeouts({ fabric_instantiate_timeout_ms: 12 });
			expect(timeouts.fabric_instantiate_timeout_ms).to.equal(12);

			timeouts = stitch.setTimeouts({ fabric_join_channel_timeout_ms: 123 });
			expect(timeouts.fabric_join_channel_timeout_ms).to.equal(123);

			timeouts = stitch.setTimeouts({ fabric_install_cc_timeout_ms: 1234 });
			expect(timeouts.fabric_install_cc_timeout_ms).to.equal(1234);

			timeouts = stitch.setTimeouts({ fabric_general_timeout_ms: 12345 });
			expect(timeouts.fabric_general_timeout_ms).to.equal(12345);

			timeouts = stitch.setTimeouts({ FABRIC_GET_BLOCK_TIMEOUT_MS: 10 });		// uppercase
			expect(timeouts.fabric_get_block_timeout_ms).to.equal(10);

			timeouts = stitch.setTimeouts({ FABRIC_get_BLOCK_tImeOuT_MS: 100 });	// mixed case
			expect(timeouts.fabric_get_block_timeout_ms).to.equal(100);

			timeouts = stitch.getTimeouts();										// test get timeouts after set so its predictable
			expect(timeouts.fabric_get_block_timeout_ms).to.equal(100);
			expect(timeouts.fabric_instantiate_timeout_ms).to.equal(12);
			expect(timeouts.fabric_join_channel_timeout_ms).to.equal(123);
			expect(timeouts.fabric_install_cc_timeout_ms).to.equal(1234);
			expect(timeouts.fabric_general_timeout_ms).to.equal(12345);
			done();
		});
	});

	const my_identity_cert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI2ekNDQVpHZ0F3SUJBZ0lVSFg5Vm5WMXRoWW5qQTNnZVo1MEQ1cVpFUStFd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeU1ERTRNamN3TUZvWERUSXhNREl4T1RFNE16SXdNRm93SVRFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1RNHdEQVlEVlFRREV3VmhaRzFwYmpCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OQpBd0VIQTBJQUJNa0xRd3FDelg0UDAwOU0rUWtrNnJNaGtpSjA3K2VHVktHcFJRbWNLOExYVUxXbzZjQzBiRXFUCnQxQW5DUWxvQVFNT0ZBR2N3dk1BMXc4REhKT2dvdktqWURCZU1BNEdBMVVkRHdFQi93UUVBd0lIZ0RBTUJnTlYKSFJNQkFmOEVBakFBTUIwR0ExVWREZ1FXQkJTRVFlaDYzOVBHa1ZoR2grb1NLWEJmUnpHaTBUQWZCZ05WSFNNRQpHREFXZ0JUNmZLKzl1Q2F5WkdtY29HV0JPS2t0Z0t3d29qQUtCZ2dxaGtqT1BRUURBZ05JQURCRkFpRUE4YXg5ClQ1cHZiakYveXorcGZWdzdhbzVXY0RrQ0hSUm5KZER1SkxlMkpib0NJR1RBcEduVkcrOHpVTUVnckpOL0VJN3EKeDhKQklnM1dGM204bVljNXFQMGIKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=';	// eslint-disable-line max-len
	const my_ca_root_cert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNGakNDQWIyZ0F3SUJBZ0lVTlNCUzAvZXh0L2U3Q3pKbDcyMU1qc0o5aFdjd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeE9URTBOREV3TUZvWERUTTFNREl4TlRFME5ERXdNRm93YURFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdFkyRXRjMlZ5CmRtVnlNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVjckhnZUJFWWtrRUptS3JoYm5mdE9FeXIKdGsyWktqKzg0STdZM1plaVdlaFVRc3Qwb1V0L1NjcWU3aHVOVmpqZ1dVcmg3TytDWFBRQXdUZGZiUjdVVXFORgpNRU13RGdZRFZSMFBBUUgvQkFRREFnRUdNQklHQTFVZEV3RUIvd1FJTUFZQkFmOENBUUV3SFFZRFZSME9CQllFCkZQcDhyNzI0SnJKa2FaeWdaWUU0cVMyQXJEQ2lNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJRlBLSnhDMFpMc2cKK1piUSs0N1dFbmNvZzNVYTZUajBsK0RuUlM4c1dPTjdBaUE4VFIyVUUwYWZqOVUwSllxVDh1UTBvOUJUOFo0TgpEQm1NclRmUXdGcUU5QT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K';	// eslint-disable-line max-len
	const unknown_identity_cert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI2akNDQVpHZ0F3SUJBZ0lVQkFmRHJIYXpQL3A3MEkzV2gzYW9tVCtMSjFzd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeE1qSXdNRGN3TUZvWERUSXhNREl4TVRJd01USXdNRm93SVRFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1RNHdEQVlEVlFRREV3VmhaRzFwYmpCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OQpBd0VIQTBJQUJEQ3MwZno5bUszODhnZWJwcjVJRWtLcG9tQTdiaHJqQUJuRG5EWnBrdExQbTRhOVZHcThiQ0RyCllINXBzU0llWU1yQXVNNElwNGo1MmpiU1QxRXU4enVqWURCZU1BNEdBMVVkRHdFQi93UUVBd0lIZ0RBTUJnTlYKSFJNQkFmOEVBakFBTUIwR0ExVWREZ1FXQkJUWVFGYVBQRnZMMFl4SkFTajN4TlVoeWpMaW1qQWZCZ05WSFNNRQpHREFXZ0JSRXRXMUtTTDdhbUpKNHRZeUY2RjRYQXFlL3lUQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQlZLSmlhCkVZVm9PUHRQTG1BZUJlWnRjd002YTJBTkxLd3FtdGJoRjhsN2p3SWdITENBeHBLc0FaNVpQQ1JnQU0wV3NKc1oKeUpNZkdYSHlrS0QxZDJGK0I1OD0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=';	// eslint-disable-line max-len
	const my_identity2_cert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNSRENDQWV1Z0F3SUJBZ0lVVDNwSk01RWpuN0x6RUpHZzNRZHZZV2NXaWRnd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeU1ERTVOVFV3TUZvWERUSXhNREl4T1RJd01EQXdNRm93SURFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1RMHdDd1lEVlFRREV3UjBaWE4wTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowRApBUWNEUWdBRU5ZaEEzakxQNjAyTnJpYS9TcVQwZ09MUTVDdUdWNG5URHB3U3R1Sk5ON0d3dnJXUThTQk5TYzFoCk1saUdDS2FHRDBDVFhJbUFJRFNvOVptS1JKc3RFcU9CdWpDQnR6QU9CZ05WSFE4QkFmOEVCQU1DQjRBd0RBWUQKVlIwVEFRSC9CQUl3QURBZEJnTlZIUTRFRmdRVUxwM0l6TXZYelIwNFFmZlZJWDFlWlh3VUFLTXdId1lEVlIwagpCQmd3Rm9BVStueXZ2Ymdtc21ScG5LQmxnVGlwTFlDc01LSXdWd1lJS2dNRUJRWUhDQUVFUzNzaVlYUjBjbk1pCk9uc2lhR1l1UVdabWFXeHBZWFJwYjI0aU9pSWlMQ0pvWmk1RmJuSnZiR3h0Wlc1MFNVUWlPaUowWlhOMElpd2kKYUdZdVZIbHdaU0k2SW1Oc2FXVnVkQ0o5ZlRBS0JnZ3Foa2pPUFFRREFnTkhBREJFQWlCeGZETEVwLzZ2NUZjUwo0K09hZ3BtdkdDKzFpQS9zeFVQaEs4ZDdYdUpJVUFJZ0VGdFNqRk12WDVwWW8wclAvT3RKMFI4OXM3cVV4c3pwCkpOK2VzeHpMdmdrPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==';	// eslint-disable-line max-len
	const chain = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNGakNDQWIyZ0F3SUJBZ0lVTlNCUzAvZXh0L2U3Q3pKbDcyMU1qc0o5aFdjd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeE9URTBOREV3TUZvWERUTTFNREl4TlRFME5ERXdNRm93YURFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdFkyRXRjMlZ5CmRtVnlNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVjckhnZUJFWWtrRUptS3JoYm5mdE9FeXIKdGsyWktqKzg0STdZM1plaVdlaFVRc3Qwb1V0L1NjcWU3aHVOVmpqZ1dVcmg3TytDWFBRQXdUZGZiUjdVVXFORgpNRU13RGdZRFZSMFBBUUgvQkFRREFnRUdNQklHQTFVZEV3RUIvd1FJTUFZQkFmOENBUUV3SFFZRFZSME9CQllFCkZQcDhyNzI0SnJKa2FaeWdaWUU0cVMyQXJEQ2lNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJRlBLSnhDMFpMc2cKK1piUSs0N1dFbmNvZzNVYTZUajBsK0RuUlM4c1dPTjdBaUE4VFIyVUUwYWZqOVUwSllxVDh1UTBvOUJUOFo0TgpEQm1NclRmUXdGcUU5QT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNGakNDQWIyZ0F3SUJBZ0lVYkFPdmR2R2s0VzVjQ1ZtTzQ1T0NUa0NzbmZ3d0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeU1ERTRNelV3TUZvWERUTTFNREl4TmpFNE16VXdNRm93YURFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdFkyRXRjMlZ5CmRtVnlNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVPNHVGK1NmMmpZK1l6UitwUnVBeGdwSFAKelVSZVZoWlJkQ01UbUluRDBvRFF0SXRpdy9EbmFGSW02VW91dG5vUmhGNmczVjBrczhJQkxxdE9pWlVQMGFORgpNRU13RGdZRFZSMFBBUUgvQkFRREFnRUdNQklHQTFVZEV3RUIvd1FJTUFZQkFmOENBUUV3SFFZRFZSME9CQllFCkZMSFRNWENRK3NHaEEwc1JKenRxQWhuZWsxRUNNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJREtUUGdFTUt0Vy8KYjg2S01tbmtDZ3hISG1VV3lTK2N5M3YrcVEyODVHY29BaUJSUHM0K1FaTjl0VDRpMUNOVjJlUzVHKzh2eG0zMQp4ZUpFWnVOUmtJZ01oQT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0=';	// eslint-disable-line max-len
	const chain_reverse = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNGakNDQWIyZ0F3SUJBZ0lVYkFPdmR2R2s0VzVjQ1ZtTzQ1T0NUa0NzbmZ3d0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeU1ERTRNelV3TUZvWERUTTFNREl4TmpFNE16VXdNRm93YURFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdFkyRXRjMlZ5CmRtVnlNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVPNHVGK1NmMmpZK1l6UitwUnVBeGdwSFAKelVSZVZoWlJkQ01UbUluRDBvRFF0SXRpdy9EbmFGSW02VW91dG5vUmhGNmczVjBrczhJQkxxdE9pWlVQMGFORgpNRU13RGdZRFZSMFBBUUgvQkFRREFnRUdNQklHQTFVZEV3RUIvd1FJTUFZQkFmOENBUUV3SFFZRFZSME9CQllFCkZMSFRNWENRK3NHaEEwc1JKenRxQWhuZWsxRUNNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJREtUUGdFTUt0Vy8KYjg2S01tbmtDZ3hISG1VV3lTK2N5M3YrcVEyODVHY29BaUJSUHM0K1FaTjl0VDRpMUNOVjJlUzVHKzh2eG0zMQp4ZUpFWnVOUmtJZ01oQT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNGakNDQWIyZ0F3SUJBZ0lVTlNCUzAvZXh0L2U3Q3pKbDcyMU1qc0o5aFdjd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeE9URTBOREV3TUZvWERUTTFNREl4TlRFME5ERXdNRm93YURFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdFkyRXRjMlZ5CmRtVnlNRmt3RXdZSEtvWkl6ajBDQVFZSUtvWkl6ajBEQVFjRFFnQUVjckhnZUJFWWtrRUptS3JoYm5mdE9FeXIKdGsyWktqKzg0STdZM1plaVdlaFVRc3Qwb1V0L1NjcWU3aHVOVmpqZ1dVcmg3TytDWFBRQXdUZGZiUjdVVXFORgpNRU13RGdZRFZSMFBBUUgvQkFRREFnRUdNQklHQTFVZEV3RUIvd1FJTUFZQkFmOENBUUV3SFFZRFZSME9CQllFCkZQcDhyNzI0SnJKa2FaeWdaWUU0cVMyQXJEQ2lNQW9HQ0NxR1NNNDlCQU1DQTBjQU1FUUNJRlBLSnhDMFpMc2cKK1piUSs0N1dFbmNvZzNVYTZUajBsK0RuUlM4c1dPTjdBaUE4VFIyVUUwYWZqOVUwSllxVDh1UTBvOUJUOFo0TgpEQm1NclRmUXdGcUU5QT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0=';	// eslint-disable-line max-len
	describe('isTrustedCertificate', () => {
		testId = 0;
		it(getId() + 'should return true, cert came from root cert', (done) => {
			let trust_opts = {
				certificate_b64pem: my_identity_cert,
				root_certs_b64pems: [my_ca_root_cert],
			};
			stitch.isTrustedCertificate(trust_opts, (_, valid) => {
				expect(valid).to.equal(true);
				done();
			});
		});

		it(getId() + 'should return false, cert came from different root cert', (done) => {
			let trust_opts = {
				certificate_b64pem: unknown_identity_cert,
				root_certs_b64pems: [my_ca_root_cert],
			};
			stitch.isTrustedCertificate(trust_opts, (_, valid) => {
				expect(valid).to.equal(false);
				done();
			});
		});

		it(getId() + 'should return true, cert came from root cert chain', (done) => {
			let trust_opts = {
				certificate_b64pem: my_identity_cert,
				root_certs_b64pems: [chain],
			};
			stitch.isTrustedCertificate(trust_opts, (_, valid) => {
				expect(valid).to.equal(true);
				done();
			});
		});

		it(getId() + 'should return true, cert came from reversed root cert chain', (done) => {
			let trust_opts = {
				certificate_b64pem: my_identity_cert,
				root_certs_b64pems: [chain_reverse],
			};
			stitch.isTrustedCertificate(trust_opts, (_, valid) => {
				expect(valid).to.equal(true);
				done();
			});
		});
	});

	describe('mapCertificatesToRoots', () => {
		testId = 0;

		it(getId() + 'should map certs to their roots', (done) => {
			const match_opts = {
				certificate_b64pems: [
					my_identity_cert,
					unknown_identity_cert,
					my_identity2_cert,
				],
				root_certs_b64pems: [
					my_ca_root_cert
				]
			};
			stitch.mapCertificatesToRoots(match_opts, (_, results) => {
				expect(JSON.stringify(results)).to.equal(JSON.stringify(
					{
						certificate_results: [
							{
								cert_serial: '1d7f559d5d6d8589e303781e679d03e6a64443e1',
								signed_by_root_serial: '352052d3f7b1b7f7bb0b3265ef6d4c8ec27d8567'
							},
							{
								cert_serial: '407c3ac76b33ffa7bd08dd68776a8993f8b275b',
								signed_by_root_serial: 'no-matches'
							},
							{
								cert_serial: '4f7a493391239fb2f31091a0dd076f61671689d8',
								signed_by_root_serial: '352052d3f7b1b7f7bb0b3265ef6d4c8ec27d8567'
							}
						]
					}));
				done();
			});
		});
	});

	describe('pem and jwk conversions', () => {
		testId = 0;

		it(getId() + 'should import a 256-bit ECDSA PEM private key and export it back to the same key', (done) => {
			// test private 256 bit key import/export
			const testPemPrivate = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgnaroz3YrKpstxBKw
MCS5lbZmBc+M4BcOrrVQMBOW6hKhRANCAAS0uLCyc21dgbQFuG+mlIrhAnS1xNJ9
wcU9oz839GszgOZ1pAT8/X5HX+3UJtGy9831oHZfJdZkDvU5Xnx4qKUd
-----END PRIVATE KEY-----
`;
			const jwk = stitch.pem2jwks({ pubKeyPEM: '', prvKeyPEM: testPemPrivate });
			stitch.importJwkEcdsaKey(jwk.private, (_, cryptoKey2) => {
				stitch.exportJwkKey(cryptoKey2, (_, prv_jwk) => {
					const pem2 = stitch.jwk2pem(prv_jwk);
					expect(pem2).to.equal(testPemPrivate);
					done();
				});
			});
		});

		it(getId() + 'should import a 256-bit ECDSA PEM public key and export it back to the same key', (done) => {
			// test public 256 bit key import/export
			const testPemPublic = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8D3lISeZ7BE4YqN9Ug7M8GIDsXVL
UP7cahBu7P5erbCNnQuKhIKSxm8zTHJ/ZFF64HHoBN586uPc3GahuW3eIA==
-----END PUBLIC KEY-----
`;
			const jwk = stitch.pem2jwks({ pubKeyPEM: testPemPublic, prvKeyPEM: '' });
			stitch.importJwkEcdsaKey(jwk.public, (_, cryptoKey2) => {
				stitch.exportJwkKey(cryptoKey2, (_, jwk) => {
					const pem = stitch.jwk2pem(jwk);
					expect(pem).to.equal(testPemPublic);
					done();
				});
			});
		});

		it(getId() + 'should import a 384-bit ECDSA PEM private key and export it back to the same key', (done) => {
			// test private 384 bit key import/export
			const testPemPrivate = `-----BEGIN PRIVATE KEY-----
MIG2AgEAMBAGByqGSM49AgEGBSuBBAAiBIGeMIGbAgEBBDDQEuAZeQq385xhVq5F
ALJxonFt4SCgg4I4gI18a98vYG7IVeH0ZeSxjiLvh8mi7tmhZANiAARh47CEAHeZ
ZwrZzRWplgdOlEoFd/l5vRgzCh8AajFttGS68KhTDXFUsS9c6AZVLo/h+tGO5PBi
vcpMI95Stgx086BNA9fI3vD0Y4eadOc0CIpL5zLaMIVha8a1PR+M22I=
-----END PRIVATE KEY-----
`;
			const jwk2 = stitch.pem2jwks({ pubKeyPEM: '', prvKeyPEM: testPemPrivate });
			stitch.importJwkEcdsaKey(jwk2.private, (_, cryptoKey2) => {
				stitch.exportJwkKey(cryptoKey2, (_, prv_jwk) => {
					const pem2 = stitch.jwk2pem(prv_jwk);
					expect(pem2).to.equal(testPemPrivate);
					done();
				});
			});
		});

		it(getId() + 'should import a 521-bit ECDSA PEM private key and export it back to the same key', (done) => {
			// test private 521 bit key import/export
			const testPemPrivate = `-----BEGIN PRIVATE KEY-----
MIHuAgEAMBAGByqGSM49AgEGBSuBBAAjBIHWMIHTAgEBBEIBy/60+yZe/tbNZNNV
33rqDw4VYv35KKjseWBNbUkY/0+tpG4qjcGr3sXqlkKkOJFLqozHlmocyULDfCR3
26whQV2hgYkDgYYABAEVihNiOZZke7Ke3swIu2HTy38z3x51YNgHXtbT3ERY1IOs
n0s3GpYpAT7ZcvVb/jW70NAcZ3tmP7OCqJ6sNJW6PwF+NmvO2x92S+BU+l3IEyVB
BRpzi54j4aBYGP+AKdq52Fl0PIRP00BRIXaju3MfBlSVbYbst6WNs6E1kXzw3yrt
5g==
-----END PRIVATE KEY-----
`;
			const jwk2 = stitch.pem2jwks({ pubKeyPEM: '', prvKeyPEM: testPemPrivate });
			stitch.importJwkEcdsaKey(jwk2.private, (_, cryptoKey2) => {
				stitch.exportJwkKey(cryptoKey2, (_, prv_jwk) => {
					const pem2 = stitch.jwk2pem(prv_jwk);
					expect(pem2).to.equal(testPemPrivate);
					done();
				});
			});
		});

		it(getId() + 'should get pub key from a ECDSA PEM Certificate', (done) => {
			// test pub certificate import/export
			const testPemCert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI2akNDQVpHZ0F3SUJBZ0lVQkFmRHJIYXpQL3A3MEkzV2gzYW9tVCtMSjFzd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl3TURJeE1qSXdNRGN3TUZvWERUSXhNREl4TVRJd01USXdNRm93SVRFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1RNHdEQVlEVlFRREV3VmhaRzFwYmpCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OQpBd0VIQTBJQUJEQ3MwZno5bUszODhnZWJwcjVJRWtLcG9tQTdiaHJqQUJuRG5EWnBrdExQbTRhOVZHcThiQ0RyCllINXBzU0llWU1yQXVNNElwNGo1MmpiU1QxRXU4enVqWURCZU1BNEdBMVVkRHdFQi93UUVBd0lIZ0RBTUJnTlYKSFJNQkFmOEVBakFBTUIwR0ExVWREZ1FXQkJUWVFGYVBQRnZMMFl4SkFTajN4TlVoeWpMaW1qQWZCZ05WSFNNRQpHREFXZ0JSRXRXMUtTTDdhbUpKNHRZeUY2RjRYQXFlL3lUQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQlZLSmlhCkVZVm9PUHRQTG1BZUJlWnRjd002YTJBTkxLd3FtdGJoRjhsN2p3SWdITENBeHBLc0FaNVpQQ1JnQU0wV3NKc1oKeUpNZkdYSHlrS0QxZDJGK0I1OD0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=';	// eslint-disable-line max-len
			const pub_key_of_cert = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEMKzR/P2YrfzyB5umvkgSQqmiYDtu
GuMAGcOcNmmS0s+bhr1UarxsIOtgfmmxIh5gysC4zginiPnaNtJPUS7zOw==
-----END PUBLIC KEY-----
`;
			const jwks = stitch.pem2jwks({ pubKeyPEM: atob(testPemCert), prvKeyPEM: '' });		// parse cert for the public key
			const pem2 = stitch.jwk2pem(jwks.public);			// create the public key from parsed cert
			expect(pem2).to.equal(pub_key_of_cert);				// compare built public key with known public key
			done();
		});
	});

	describe('sign and verify using web subtle crypto', () => {
		testId = 0;

		it(getId() + 'should import a ecdsa pem and sign and verify signature', (done) => {
			const data = 'the cloud people will rule us all';
			const raw_msg = stitch.utf8StrToUint8Array(data);
			stitch.scGenEcdsaKeys(null, (_, key_pair) => {
				const jwk = stitch.pem2jwks({ pubKeyPEM: key_pair.pubKeyPEM, prvKeyPEM: key_pair.prvKeyPEM });

				stitch.scSignPemRaw(key_pair.prvKeyPEM, raw_msg, (_, raw_signature) => {
					stitch.importJwkEcdsaKey(jwk.public, (_, cryptoKey1) => {
						stitch.subtleVerifySignature(cryptoKey1, raw_signature, raw_msg, (_, valid) => {
							expect(valid).to.equal(true);
							done();
						});
					});
				});
			});
		});

		it(getId() + 'should import a ecdsa pem and sign and FAIL to verify signature', (done) => {
			const data = 'bombs away buddy';
			const raw_msg = stitch.utf8StrToUint8Array(data);
			stitch.scGenEcdsaKeys(null, (_, key_pair) => {
				const jwk = stitch.pem2jwks({ pubKeyPEM: key_pair.pubKeyPEM, prvKeyPEM: key_pair.prvKeyPEM });

				stitch.scSignPemRaw(key_pair.prvKeyPEM, raw_msg, (_, signed) => {
					signed[0] = 0x99;												// mess it up
					stitch.importJwkEcdsaKey(jwk.public, (_, cryptoKey1) => {
						stitch.subtleVerifySignature(cryptoKey1, signed, raw_msg, (_, verified2) => {
							expect(verified2).to.equal(false);
							done();
						});
					});
				});
			});
		});
	});

	describe('generate ecdsa pem keys using web subtle crypto', () => {
		testId = 0;

		it(getId() + 'should generate ecdsa pem keys', (done) => {
			stitch.scGenEcdsaKeys(null, (_, keypair) => {
				expect(keypair.pubKeyPEM).to.be.not.undefined;
				expect(keypair.prvKeyPEM).to.be.not.undefined;
				expect(keypair.pubKeyPEMb64).to.be.not.undefined;
				expect(keypair.prvKeyPEMb64).to.be.not.undefined;

				expect(keypair.pubKeyPEM).to.not.equal('');
				expect(keypair.prvKeyPEM).to.not.equal('');
				expect(keypair.pubKeyPEMb64).to.not.equal('');
				expect(keypair.prvKeyPEMb64).to.not.equal('');
				done();
			});
		});
	});

	describe('verify certs', () => {
		testId = 0;
		const testPemPrivate = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgnaroz3YrKpstxBKw
MCS5lbZmBc+M4BcOrrVQMBOW6hKhRANCAAS0uLCyc21dgbQFuG+mlIrhAnS1xNJ9
wcU9oz839GszgOZ1pAT8/X5HX+3UJtGy9831oHZfJdZkDvU5Xnx4qKUd
-----END PRIVATE KEY-----
`;

		const testPemPublic = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8D3lISeZ7BE4YqN9Ug7M8GIDsXVL
UP7cahBu7P5erbCNnQuKhIKSxm8zTHJ/ZFF64HHoBN586uPc3GahuW3eIA==
-----END PUBLIC KEY-----
`;

		const testPemCert = `-----BEGIN CERTIFICATE-----
MIIB6jCCAZGgAwIBAgIUBAfDrHazP/p70I3Wh3aomT+LJ1swCgYIKoZIzj0EAwIw
aDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK
EwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt
Y2Etc2VydmVyMB4XDTIwMDIxMjIwMDcwMFoXDTIxMDIxMTIwMTIwMFowITEPMA0G
A1UECxMGY2xpZW50MQ4wDAYDVQQDEwVhZG1pbjBZMBMGByqGSM49AgEGCCqGSM49
AwEHA0IABDCs0fz9mK388gebpr5IEkKpomA7bhrjABnDnDZpktLPm4a9VGq8bCDr
YH5psSIeYMrAuM4Ip4j52jbST1Eu8zujYDBeMA4GA1UdDwEB/wQEAwIHgDAMBgNV
HRMBAf8EAjAAMB0GA1UdDgQWBBTYQFaPPFvL0YxJASj3xNUhyjLimjAfBgNVHSME
GDAWgBREtW1KSL7amJJ4tYyF6F4XAqe/yTAKBggqhkjOPQQDAgNHADBEAiBVKJia
EYVoOPtPLmAeBeZtcwM6a2ANLKwqmtbhF8l7jwIgHLCAxpKsAZ5ZPCRgAM0WsJsZ
yJMfGXHykKD1d2F+B58=
-----END CERTIFICATE-----
`;

		it(getId() + 'should validate a private key - PEM/Base64', (done) => {
			const valid = stitch.validatePrivateKey(testPemPrivate);
			expect(valid).to.equal(true);
			const valid2 = stitch.validatePrivateKey(btoa(testPemPrivate));
			expect(valid2).to.equal(true);
			done();
		});

		it(getId() + 'should validate a public key - PEM/Base64', (done) => {
			const valid = stitch.validatePublicKey(testPemPublic);
			expect(valid).to.equal(true);
			const valid2 = stitch.validatePublicKey(btoa(testPemPublic));
			expect(valid2).to.equal(true);
			done();
		});

		it(getId() + 'should validate a certificate - PEM/Base64', (done) => {
			const valid = stitch.validateCertificate(testPemCert);
			expect(valid).to.equal(true);
			const valid2 = stitch.validateCertificate(btoa(testPemCert));
			expect(valid2).to.equal(true);
			done();
		});

		it(getId() + 'should NOT validate a private key  as a pub key/cert - PEM/Base64', (done) => {
			const valid = stitch.validatePublicKey(testPemPrivate);
			expect(valid).to.equal(false);
			const valid2 = stitch.validateCertificate(testPemPrivate);
			expect(valid2).to.equal(false);
			done();
		});

		it(getId() + 'should NOT validate a public key as a priv key/cert - PEM/Base64', (done) => {
			const valid = stitch.validatePrivateKey(testPemPublic);
			expect(valid).to.equal(false);
			const valid2 = stitch.validateCertificate(testPemPublic);
			expect(valid2).to.equal(false);
			done();
		});

		it(getId() + 'should NOT validate a certificate as a priv/pub key - PEM/Base64', (done) => {
			const valid = stitch.validatePrivateKey(testPemCert);
			expect(valid).to.equal(false);
			const valid2 = stitch.validatePublicKey(testPemCert);
			expect(valid2).to.equal(false);
			done();
		});

		it(getId() + 'should NOT validate a malformed private key - invalid format', (done) => {
			const invalid_prv_key = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUdIQWdFQU1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhCRzB3YXdJQkFRUWdOMFlqMUN6d2RvbHlTdDlWXG5iQ0dwWkdQSnM5YStOMm1VRU5hZnZxd3NxbTJoUkFOQ0FBUWR6dEZGWDNweSs4V3ZGV1dDV1FObGZUZFpYT1V5XG5STWgvWkZCWkF6SndnYVpXVmZzdmxxaDNhMmhhQ2wrN09PT21nVy9WdlRrMStENWtwcjJnTWwxa1xuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQo';	// eslint-disable-line max-len
			const valid = stitch.validatePrivateKey(invalid_prv_key);
			expect(valid).to.equal(false);
			done();
		});
	});

	describe('generate csr pem using web subtle crypto', () => {
		testId = 0;

		it(getId() + 'should generate csr pem with sans extensions', (done) => {
			stitch.scGenEcdsaKeys(null, (_, keys) => {
				const enrollOptions = {
					enroll_id: 'admin',
					ext: {
						subjectAltName: [
							{ dns: 'example.com' },
							{ ip: '127.0.0.1' }
						]
					}
				};
				const csr_opts = {								// options to make a Certificate Signing Request
					client_prv_key_b64pem: keys.prvKeyPEMb64,
					client_pub_key_b64pem: keys.pubKeyPEMb64,
					subject: 'CN=' + enrollOptions.enroll_id,
					ext: enrollOptions.ext
				};

				stitch.scGenCSR(csr_opts, (_, csrPEM) => {
					const has_header = csrPEM.includes('-----BEGIN CERTIFICATE REQUEST-----');
					const has_footer = csrPEM.includes('-----END CERTIFICATE REQUEST-----');
					const b64 = csrPEM.substring(36, csrPEM.length - 35);
					const hex = stitch.base64toHexStr(b64);

					// this is the der (as hex) of the sans extension {dns : "example.com"}
					const contains_correct_dns_ext_tag = hex.toUpperCase().includes('820B6578616D706C652E636F6D');

					// this is the der (as hex) of the ext sans ip -> "127.0.0.1"
					const contains_correct_ip_ext_tag = hex.toUpperCase().includes('87047F000001');

					// this is the der (as hex) of the common name "admin"
					const contains_correct_common_name = hex.toUpperCase().includes('0C0561646D696E');

					// this is the der (as hex) of the octstr tag for SANs extensions... see fixCsr() for details
					const contains_correct_octstr_tag = hex.toUpperCase().includes('0603551D1104');

					expect(has_header).to.equal(true);
					expect(has_footer).to.equal(true);
					expect(contains_correct_dns_ext_tag).to.equal(true);
					expect(contains_correct_ip_ext_tag).to.equal(true);
					expect(contains_correct_common_name).to.equal(true);
					expect(contains_correct_octstr_tag).to.equal(true);
					done();
				});
			});
		});

		it(getId() + 'should generate csr pem without sans extensions', (done) => {
			stitch.scGenEcdsaKeys(null, (_, keys) => {
				const enrollOptions = {
					enroll_id: 'admin',
				};
				const csr_opts = {								// options to make a Certificate Signing Request
					client_prv_key_b64pem: keys.prvKeyPEMb64,
					client_pub_key_b64pem: keys.pubKeyPEMb64,
					subject: 'CN=' + enrollOptions.enroll_id,
					ext: null
				};

				stitch.scGenCSR(csr_opts, (_, csrPEM) => {
					const has_header = csrPEM.includes('-----BEGIN CERTIFICATE REQUEST-----');
					const has_footer = csrPEM.includes('-----END CERTIFICATE REQUEST-----');
					const b64 = csrPEM.substring(36, csrPEM.length - 35);
					const hex = stitch.base64toHexStr(b64);

					// this is the der (as hex) of the sans extension {dns : "example.com"}
					const contains_correct_ext_tag = hex.toUpperCase().includes('820B6578616D706C652E636F6D');

					// this is the der (as hex) of the common name "admin"
					const contains_correct_common_name = hex.toUpperCase().includes('0C0561646D696E');

					expect(has_header).to.equal(true);
					expect(has_footer).to.equal(true);
					expect(contains_correct_ext_tag).to.equal(false);
					expect(contains_correct_common_name).to.equal(true);
					done();
				});
			});
		});

		it(getId() + 'should generate csr pem (using subtle crypto keys) with sans extensions', (done) => {
			stitch.scGenEcdsaKeys(null, (_, keys) => {
				const enrollOptions = {
					enroll_id: 'admin',
					ext: {
						subjectAltName: [
							{ dns: 'example.com' },
							{ ip: '127.0.0.1' }
						]
					}
				};
				const csr_opts = {								// options to make a Certificate Signing Request
					client_prv_key_b64pem: keys.prvKeyPEMb64,
					client_pub_key_b64pem: keys.pubKeyPEMb64,
					subject: 'CN=' + enrollOptions.enroll_id,
					ext: enrollOptions.ext
				};

				stitch.scGenCSR(csr_opts, (_, csrPEM) => {
					const has_header = csrPEM.includes('-----BEGIN CERTIFICATE REQUEST-----');
					const has_footer = csrPEM.includes('-----END CERTIFICATE REQUEST-----');
					const b64 = csrPEM.substring(36, csrPEM.length - 35);
					const hex = stitch.base64toHexStr(b64);

					// this is the der (as hex) of the sans extension {dns : "example.com"}
					const contains_correct_dns_ext_tag = hex.toUpperCase().includes('820B6578616D706C652E636F6D');

					// this is the der (as hex) of the ext sans ip -> "127.0.0.1"
					const contains_correct_ip_ext_tag = hex.toUpperCase().includes('87047F000001');

					// this is the der (as hex) of the common name "admin"
					const contains_correct_common_name = hex.toUpperCase().includes('0C0561646D696E');

					expect(has_header).to.equal(true);
					expect(has_footer).to.equal(true);
					expect(contains_correct_dns_ext_tag).to.equal(true);
					expect(contains_correct_ip_ext_tag).to.equal(true);
					expect(contains_correct_common_name).to.equal(true);
					done();
				});
			});
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	describe('__b_build_collection_config_package', () => {
		testId = 0;

		it(getId() + 'should return decoded collection package that matches input - cli syntax [v1 - simple AND]', (done) => {
			const opts = {
				name: 'myCollection-v1',
				required_peer_count: 1,

				member_orgs_policy: `AND('Org1.admin', 'Org2.member')`,	// eslint-disable-line quotes

				maximum_peer_count: 5,
				block_to_live: 1,
				member_only_read: true,
				member_only_write: false,

				endorsement_policy: null
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': null
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - cli syntax [v2 - simple OR]', (done) => {
			const opts = {
				name: 'myCollection-v2',
				required_peer_count: 1,

				member_orgs_policy: `OR('Org1.admin', 'Org2.member')`,	// eslint-disable-line quotes

				maximum_peer_count: 5,
				block_to_live: 1,
				member_only_read: true,
				member_only_write: false,

				endorsement_policy: null
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 1,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': null
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - cli syntax [v3 - simple OutOf]', (done) => {
			const opts = {
				name: 'myCollection-v3',
				required_peer_count: 1,

				member_orgs_policy: `OutOf(2, 'Org1.admin', 'Org2.member', 'Org3.member')`,	// eslint-disable-line quotes

				maximum_peer_count: 5,
				block_to_live: 1,
				member_only_read: true,
				member_only_write: false,

				endorsement_policy: null
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
													{
														'signedBy': 2
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org3',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': null
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - cli syntax [v4 - complex]', (done) => {
			const opts = {
				name: 'myCollection-v4',
				required_peer_count: 1,

				// mess up case too
				member_orgs_policy: `And('Org1.MEMBER', or('Org2.member', 'Org3.MeMbEr', 'Org4.member'), 'Org5.memBER')`,	// eslint-disable-line quotes

				maximum_peer_count: 5,
				block_to_live: 1,
				member_only_read: true,
				member_only_write: false,

				endorsement_policy: null
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 3,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'nOutOf': {
															'n': 1,
															'rules': [
																{
																	'signedBy': 1
																},
																{
																	'signedBy': 2
																},
																{
																	'signedBy': 3
																}
															]
														}
													},
													{
														'signedBy': 4
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org3',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org4',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org5',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': null
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - cli syntax [v5 - long]', (done) => {
			const opts = {
				name: 'myCollection-v5',
				required_peer_count: 1,

				// mess up case too
				member_orgs_policy: `OR('Org1.MEMBER', 'Org2.member', 'Org3.MeMbEr', 'Org4.member', 'Org5.memBER')`,	// eslint-disable-line quotes

				maximum_peer_count: 5,
				block_to_live: 1,
				member_only_read: true,
				member_only_write: false,

				endorsement_policy: {
					signature_policy: `OR(Org4.admin', 'Org5.admin')`,	// eslint-disable-line quotes
				}

			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 1,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
													{
														'signedBy': 2
													},
													{
														'signedBy': 3
													},
													{
														'signedBy': 4
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org3',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org4',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org5',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': {
									signaturePolicy: {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 1,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org4',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org5',
													'role': 'ADMIN'
												}
											}
										]
									}
								}
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - cli syntax [v6 - complex]', (done) => {
			const opts = {
				name: 'myCollection-v6',
				required_peer_count: 1,

				member_orgs_policy: `AND('Org1.admin', OR('Org2.member', OutOf(2, 'Org1.member', 'Org3.member'),'Org3.member'))`,	// eslint-disable-line max-len, quotes

				maximum_peer_count: 5,
				block_to_live: 1,
				member_only_read: true,
				member_only_write: false,

				endorsement_policy: {
					signature_policy: `AND('Org1.admin', OutOf(2, 'Org2.member', 'Org3.member'))`,	// eslint-disable-line quotes
				}
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'nOutOf': {
															'n': 1,
															'rules': [
																{
																	'signedBy': 1
																},
																{
																	'nOutOf': {
																		'n': 2,
																		'rules': [
																			{
																				'signedBy': 2
																			},
																			{
																				'signedBy': 3
																			}
																		]
																	}
																},
																{
																	'signedBy': 3
																}
															]
														}
													}
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org3',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'nOutOf': {
															'n': 2,
															'rules': [
																{
																	'signedBy': 1
																},
																{
																	'signedBy': 2
																}
															]
														}
													}
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org3',
													'role': 'MEMBER'
												}
											}
										]
									}
								}
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - peer sdk syntax [v7 - simple AND]', (done) => {
			const opts = {
				name: 'myCollection-v7',
				required_peer_count: 1,

				member_orgs_policy: {
					identities: [
						{
							role: {
								name: 'admin',
								mspId: 'Org1'
							}
						},
						{
							role: {
								name: 'member',
								mspId: 'Org2'
							}
						}
					],
					policy: {
						'2-of': [
							{ 'signed-by': 0 },
							{ 'signed-by': 1 },
						]
					}
				},

				maximum_peer_count: 7,
				block_to_live: 2,
				member_only_read: false,
				member_only_write: false,

				endorsement_policy: null
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': 0,
										'rule': {
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'MEMBER'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': null
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return decoded collection package that matches input - fabric syntax [v8 - simple AND]', (done) => {
			const opts = {
				name: 'myCollection-v8',
				required_peer_count: 1,

				member_orgs_policy: {
					'version': 3,
					'rule': {
						'nOutOf': {
							'n': 2,
							'rules': [
								{
									'signedBy': 0
								},
								{
									'signedBy': 1
								},
							]
						}
					},
					'identities': [
						{
							'principal': {
								'mspIdentifier': 'Org1',
								'role': 'admin'
							}
						},
						{
							'principal': {
								'mspIdentifier': 'Org2',
								'role': 'admin'
							}
						}
					]
				},

				maximum_peer_count: 7,
				block_to_live: 2,
				member_only_read: false,
				member_only_write: false,

				endorsement_policy: null
			};
			stitch.test_encodeDecode_collection_config_packaged([opts], (_, resp) => {
				//console.log('decoded: ', JSON.stringify(resp.decoded, null, 2));
				const expected = {
					'config': [
						{
							'staticCollectionConfig': {
								'name': opts.name,
								'memberOrgsPolicy': {
									'signaturePolicy': {
										'version': opts.member_orgs_policy.version,
										'rule': {
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 0
													},
													{
														'signedBy': 1
													},
												]
											}
										},
										'identities': [
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org1',
													'role': 'ADMIN'
												}
											},
											{
												'principalClassification': 0,
												'principal': {
													'mspIdentifier': 'Org2',
													'role': 'ADMIN'
												}
											}
										]
									}
								},
								'requiredPeerCount': opts.required_peer_count,
								'maximumPeerCount': opts.maximum_peer_count,
								'blockToLive': opts.block_to_live,
								'memberOnlyRead': opts.member_only_read,
								'memberOnlyWrite': opts.member_only_write,
								'endorsementPolicy': null
							}
						}
					]
				};
				expect(resp.decoded).to.deep.equal(expected);
				done();
			});
		});

		it(getId() + 'should return formatted policy - cli syntax [v9a - complex]', (done) => {
			let policy = stitch.conformPolicySyntax(`OR('Org1.admin', AND('Org2.member', 'Org3.member'), OutOf(2, 'Org1.member','Org2.member', 'Org3.member'))`);	// eslint-disable-line max-len, quotes
			const expected = {
				'version': 0,
				'identities': [
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'ADMIN'
						}
					},
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org3',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'MEMBER'
						}
					},
				],
				'rule': {
					'nOutOf': {
						'n': 1,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'nOutOf': {
									'n': 2,
									'rules': [
										{
											'signedBy': 1
										},
										{
											'signedBy': 2
										},
									]
								}
							},
							{
								'nOutOf': {
									'n': 2,
									'rules': [
										{
											'signedBy': 3
										},
										{
											'signedBy': 1
										},
										{
											'signedBy': 2
										},
									]
								}
							}
						]
					}
				}
			};
			expect(policy).to.deep.equal(expected);
			done();
		});

		// ----------- now do error paths -----------
		it(getId() + 'should return error from invalid string policy - cli syntax [v10 - missing )]', (done) => {
			const policy = stitch.conformPolicySyntax(`OR('Org1.admin', AND('Org2.member'), OutOf(2, 'Org1.member')`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});

		it(getId() + 'should return error from invalid string policy - cli syntax [v11 - missing (]', (done) => {
			const policy = stitch.conformPolicySyntax(`OR('Org1.admin', AND'Org2.member'))`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});

		it(getId() + 'should return error from invalid string policy - cli syntax [v12 - missing (]', (done) => {
			const policy = stitch.conformPolicySyntax(`OR'Org1.admin', AND('Org2.member'))`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});

		it(getId() + 'should return error from invalid string policy - cli syntax [v13 - bad command]', (done) => {
			const policy = stitch.conformPolicySyntax(`OR('Org1.admin', BUBBA('Org2.member', 'Org3.member'))`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});

		it(getId() + 'should return error from invalid string policy - cli syntax [v14 - bad range]', (done) => {
			const policy = stitch.conformPolicySyntax(`OutOf(2, 'Org1.member')`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});

		it(getId() + 'should return error from invalid string policy - cli syntax [v15 - missing role]', (done) => {
			const policy = stitch.conformPolicySyntax(`AND('Org1.member', 'Org1)`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});

		it(getId() + 'should return error from invalid string policy - cli syntax [v16 - range n/a]', (done) => {
			const policy = stitch.conformPolicySyntax(`AND(2, 'Org1.member', 'Org1.member)`);	// eslint-disable-line quotes
			expect(policy).to.equal(null);
			done();
		});
	});

	describe('convertPolicy2PeerCliSyntax', () => {
		testId = 0;

		it(getId() + 'should return peer cli syntax - lowercase - [v1a - simple AND]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'nOutOf': {
						'n': 2,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'signedBy': 1
							},
						]
					}
				},
				'identities': [
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'admin'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'member'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`AND('Org1.ADMIN', 'Org2.MEMBER')`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax - underscores- [v1b - simple AND]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'n_out_of': {
						'n': 2,
						'rules': [
							{
								'signed_by': 0
							},
							{
								'signed_by': 1
							},
						]
					}
				},
				'identities': [
					{
						'principal_classification': 0,
						'principal': {
							'msp_identifier': 'Org1',
							'role': 'ADMIN'
						}
					},
					{
						'principal_classification': 0,
						'principal': {
							'msp_identifier': 'Org2',
							'role': 'MEMBER'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`AND('Org1.ADMIN', 'Org2.MEMBER')`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax  [v2 - simple OR]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'nOutOf': {
						'n': 1,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'signedBy': 1
							},
						]
					}
				},
				'identities': [
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'ADMIN'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`OR('Org1.ADMIN', 'Org2.MEMBER')`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax [v3 - simple OutOf]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'nOutOf': {
						'n': 2,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'signedBy': 1
							},
							{
								'signedBy': 2
							},
						]
					}
				},
				'identities': [
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'ADMIN'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org3',
							'role': 'MEMBER'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`OutOf(2, 'Org1.ADMIN', 'Org2.MEMBER', 'Org3.MEMBER')`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax [v4 - complex]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'nOutOf': {
						'n': 3,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'nOutOf': {
									'n': 1,
									'rules': [
										{
											'signedBy': 1
										},
										{
											'signedBy': 2
										},
										{
											'signedBy': 3
										}
									]
								}
							},
							{
								'signedBy': 4
							},
						]
					}
				},
				'identities': [
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org3',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org4',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org5',
							'role': 'MEMBER'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`AND('Org1.MEMBER', OR('Org2.MEMBER', 'Org3.MEMBER', 'Org4.MEMBER'), 'Org5.MEMBER')`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax [v5 - long]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'nOutOf': {
						'n': 1,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'signedBy': 1
							},
							{
								'signedBy': 2
							},
							{
								'signedBy': 3
							},
							{
								'signedBy': 4
							},
						]
					}
				},
				'identities': [
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org3',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org4',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org5',
							'role': 'MEMBER'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`OR('Org1.MEMBER', 'Org2.MEMBER', 'Org3.MEMBER', 'Org4.MEMBER', 'Org5.MEMBER')`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax [v6 - complex]', (done) => {
			const opts = {
				'version': 0,
				'rule': {
					'nOutOf': {
						'n': 2,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'nOutOf': {
									'n': 1,
									'rules': [
										{
											'signedBy': 1
										},
										{
											'nOutOf': {
												'n': 2,
												'rules': [
													{
														'signedBy': 2
													},
													{
														'signedBy': 3
													}
												]
											}
										},
										{
											'signedBy': 3
										}
									]
								}
							}
						]
					}
				},
				'identities': [
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'ADMIN'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 0,
						'principal': {
							'mspIdentifier': 'Org3',
							'role': 'MEMBER'
						}
					}
				]
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`AND('Org1.ADMIN', OR('Org2.MEMBER', AND('Org1.MEMBER', 'Org3.MEMBER'), 'Org3.MEMBER'))`);	// eslint-disable-line quotes
			done();
		});

		it(getId() + 'should return peer cli syntax [v9b - complex]', (done) => {
			const opts = {
				'version': 0,
				'identities': [
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'ADMIN'
						}
					},
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org2',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org3',
							'role': 'MEMBER'
						}
					},
					{
						'principalClassification': 'ROLE',
						'principal': {
							'mspIdentifier': 'Org1',
							'role': 'MEMBER'
						}
					},
				],
				'rule': {
					'nOutOf': {
						'n': 1,
						'rules': [
							{
								'signedBy': 0
							},
							{
								'nOutOf': {
									'n': 2,
									'rules': [
										{
											'signedBy': 1
										},
										{
											'signedBy': 2
										},
									]
								}
							},
							{
								'nOutOf': {
									'n': 2,
									'rules': [
										{
											'signedBy': 3
										},
										{
											'signedBy': 1
										},
										{
											'signedBy': 2
										},
									]
								}
							}
						]
					}
				}
			};
			const policy = stitch.convertPolicy2PeerCliSyntax(opts);
			expect(policy).to.equal(`OR('Org1.ADMIN', AND('Org2.MEMBER', 'Org3.MEMBER'), OutOf(2, 'Org1.MEMBER', 'Org2.MEMBER', 'Org3.MEMBER'))`);	// eslint-disable-line max-len, quotes
			done();
		});
	});


	describe('policyIsMet', () => {
		testId = 0;
		const policy_and = {
			'version': 0,
			'rule': {
				'nOutOf': {
					'n': 2,
					'rules': [
						{
							'signedBy': 0
						},
						{
							'signedBy': 1
						},
					]
				}
			},
			'identities': [
				{
					'principalClassification': 0,
					'principal': {
						'mspIdentifier': 'Org1',
						'role': 'peer'
					}
				},
				{
					'principalClassification': 0,
					'principal': {
						'mspIdentifier': 'Org2',
						'role': 'member'
					}
				}
			]
		};
		const complex_policy = {
			'version': 0,
			'rule': {
				'nOutOf': {
					'n': 2,
					'rules': [
						{ 'signedBy': 0 },
						{
							'nOutOf': {
								'n': 1,
								'rules': [
									{ 'signedBy': 1 },
									{
										'nOutOf': {
											'n': 2,
											'rules': [
												{ 'signedBy': 2 },
												{ 'signedBy': 3 }
											]
										}
									},
									{ 'signedBy': 3 }
								]
							}
						}
					]
				}
			},
			'identities': [
				{
					'principalClassification': 0,
					'principal': {
						'mspIdentifier': 'Org1',
						'role': 'PEER'
					}
				},
				{
					'principalClassification': 0,
					'principal': {
						'mspIdentifier': 'Org2',
						'role': 'PEER'
					}
				},
				{
					'principalClassification': 0,
					'principal': {
						'mspIdentifier': 'Org3',
						'role': 'PEER'
					}
				},
				{
					'principalClassification': 0,
					'principal': {
						'mspIdentifier': 'Org4',
						'role': 'PEER'
					}
				}
			]
		};

		it(getId() + 'should return true, policy met - [a simple AND]', (done) => {
			const approvals = {
				'Org1': true,
				'Org2': true,
			};
			const is_met = stitch.policyIsMet(policy_and, approvals);
			expect(is_met).to.equal(true);
			done();
		});

		it(getId() + 'should return false, policy not met - [b simple AND]', (done) => {
			const approvals = {
				'Org1': false,
				'Org2': true,
			};
			const is_met = stitch.policyIsMet(policy_and, approvals);
			expect(is_met).to.equal(false);
			done();
		});

		it(getId() + 'should return false, policy not met - [c simple AND]', (done) => {
			const approvals = {
				'Org1': true,
				'Org2': false,
			};
			const is_met = stitch.policyIsMet(policy_and, approvals);
			expect(is_met).to.equal(false);
			done();
		});



		it(getId() + 'should return true, policy not met - [d complex]', (done) => {
			const approvals = {
				'Org1.PEER': true,
				'Org2.PEER': false,
				'Org3.PEER': true,
				'Org4.PEER': true,
			};
			const is_met = stitch.policyIsMet(complex_policy, approvals);
			expect(is_met).to.equal(true);
			done();
		});

		it(getId() + 'should return false, policy not met - [e complex]', (done) => {
			const approvals = {
				'Org1.PEER': true,
				'Org2.PEER': false,
				'Org3.PEER': false,
				'Org4.PEER': false,
			};
			const is_met = stitch.policyIsMet(complex_policy, approvals);
			expect(is_met).to.equal(false);
			done();
		});

		it(getId() + 'should return false, policy not met - [f complex]', (done) => {
			const approvals = {
				'Org1.PEER': false,
				'Org2.PEER': true,
				'Org3.PEER': true,
				'Org4.PEER': true,
			};
			const is_met = stitch.policyIsMet(complex_policy, approvals);
			expect(is_met).to.equal(false);
			done();
		});

		it(getId() + 'should return false, policy not met - [g complex]', (done) => {
			const approvals = {
				'Org1.PEER': true,
				'Org2.PEER': false,
				'Org3.PEER': true,
				'Org4.PEER': false,
			};
			const is_met = stitch.policyIsMet(complex_policy, approvals);
			expect(is_met).to.equal(false);
			done();
		});
	});

	describe('safer_hex_str', () => {
		testId = 0;

		it(getId() + 'should return safer hex string - no changes', (done) => {
			const hex = 'v2.209541CB47DBC68308BA2E418CFB1E6BF8A0D67F63E8E1B1D7F7B3E0645AC047E8CA53135A8AB6B67BE0D8709F';
			expect(stitch.safer_hex_str(hex)).to.equal(hex);
			done();
		});

		it(getId() + 'should return safer hex string - script changes', (done) => {
			const hex = 'v2.209541CB47DBC68308BA2E41<script>console.log(\'yo\');</script>8CFB1E6BF8A0';
			expect(stitch.safer_hex_str(hex)).to.equal('v2.209541CB47DBC68308BA2E41cce.c8CFB1E6BF8A0');
			done();
		});

		it(getId() + 'should return safer hex string - lowercase no changes', (done) => {
			const hex = 'v2.abcdEF';
			expect(stitch.safer_hex_str(hex)).to.equal(hex);
			done();
		});
	});

	describe('url_join', () => {
		testId = 0;

		it(getId() + 'should return proper url - no slashes', (done) => {
			const url1 = 'https://something.com/what';
			const url2 = 'something/here';
			expect(stitch.url_join(url1, url2)).to.equal(url1 + '/' + url2);
			done();
		});

		it(getId() + 'should return proper url - trailing slashe', (done) => {
			const url1 = 'https://something.com/what/';
			const url2 = 'something/here';
			expect(stitch.url_join(url1, url2)).to.equal(url1 + url2);
			done();
		});

		it(getId() + 'should return proper url - leading slash', (done) => {
			const url1 = 'https://something.com/what';
			const url2 = '/something/here';
			expect(stitch.url_join(url1, url2)).to.equal(url1 + url2);
			done();
		});

		it(getId() + 'should return proper url - double slash', (done) => {
			const url1 = 'https://something.com/what/';
			const url2 = '/something/here';
			expect(stitch.url_join(url1, url2)).to.equal(url1.substring(0, url1.length - 1) + url2);
			done();
		});

		it(getId() + 'should return proper url - no http slash', (done) => {
			const url1 = '/something.com/what';
			const url2 = '/something/here';
			expect(stitch.url_join(url1, url2)).to.equal(url1 + url2);
			done();
		});
	});

	describe('MSP Role', () => {
		it(getId() + 'should return MSP role with the correct ROLE enum string - PEER', (done) => {
			stitch.load_pb((__pb_root) => {
				const MSPRole = __pb_root.lookupType('common.MSPRole');
				let msp_opts = {
					mspIdentifier: 'msp1',
					role: 'PEER',
				};
				const b_mspRole = stitch.policyLib.__b_build_msp_role(msp_opts);
				let msg2 = MSPRole.decode(b_mspRole);
				let obj = MSPRole.toObject(msg2, { defaults: false });
				expect(obj).to.deep.equal({ mspIdentifier: 'msp1', role: 3 });
				done();
			});
		});

		it(getId() + 'should return MSP role with the correct ROLE enum string - ADMIN', (done) => {
			stitch.load_pb((__pb_root) => {
				const MSPRole = __pb_root.lookupType('common.MSPRole');
				let msp_opts = {
					mspIdentifier: 'msp2',
					role: 'ADMIN',
				};
				const b_mspRole = stitch.policyLib.__b_build_msp_role(msp_opts);
				let msg2 = MSPRole.decode(b_mspRole);
				let obj = MSPRole.toObject(msg2, { defaults: false });
				expect(obj).to.deep.equal({ mspIdentifier: 'msp2', role: 1 });
				done();
			});
		});

		it(getId() + 'should return MSP role with the correct ROLE enum string - lc admin', (done) => {
			stitch.load_pb((__pb_root) => {
				const MSPRole = __pb_root.lookupType('common.MSPRole');
				let msp_opts = {
					mspIdentifier: 'msp3',
					role: 'admin',
				};
				const b_mspRole = stitch.policyLib.__b_build_msp_role(msp_opts);
				let msg2 = MSPRole.decode(b_mspRole);
				let obj = MSPRole.toObject(msg2, { defaults: false });
				expect(obj).to.deep.equal({ mspIdentifier: 'msp3', role: 1 });
				done();
			});
		});

		it(getId() + 'should return MSP role with the correct ROLE enum string - MEMBER', (done) => {
			stitch.load_pb((__pb_root) => {
				const MSPRole = __pb_root.lookupType('common.MSPRole');
				let msp_opts = {
					mspIdentifier: 'msp3',
					role: 'MEMBER',
				};
				const b_mspRole = stitch.policyLib.__b_build_msp_role(msp_opts);
				let msg2 = MSPRole.decode(b_mspRole);
				let obj = MSPRole.toObject(msg2, { defaults: false });
				expect(obj).to.deep.equal({ mspIdentifier: 'msp3', role: 0 });
				done();
			});
		});
	});

	describe('base64ToUtf8', () => {
		testId = 0;

		it(getId() + 'should return utf8 string - ascii', (done) => {
			const b64str = 'aGVsbG8tdGhlcmUtYnVkZHkhQCMhJF4m';
			expect(stitch.base64ToUtf8(b64str)).to.equal('hello-there-buddy!@#!$^&');
			done();
		});

		it(getId() + 'should return utf8 string - utf8 - chinese', (done) => {
			const b64str = '5ryi5a2X';
			expect(stitch.base64ToUtf8(b64str)).to.equal('漢字');
			done();
		});

		it(getId() + 'should return utf8 string - utf8 - emojii', (done) => {
			const b64str = '8J+ZgvCfmIDwn5iD';
			expect(stitch.base64ToUtf8(b64str)).to.equal('🙂😀😃');
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------------------------
	// don't leave this test in.  comment it out and run it manually.
	//describe('create a new channel', () => {
	//	testId = 0;
	//	it(getId() + 'should create a new channel', (done) => {

	//		// -----------------------------------
	//		// below is copied from the readme... (more or less)
	//		// -----------------------------------
	//		const opts = {
	//			channel_id: 'my-channel' + Date.now(),
	//			consortium_id: test_consortium_id,
	//			application_msp_ids: [test_msp_id],
	//			fabric_version: '1.1',
	//		};
	//		const config_update = stitch.buildConfigUpdateTemplateNewChannel(opts);
	//		config_update.writeSet.groups.Application.policies.Admins.policy = {
	//			type: 1,
	//			value: {
	//				identities: [{
	//					principal: {
	//						mspIdentifier: test_msp_id,
	//						role: 'ADMIN'
	//					}
	//				}],
	//				rule: {
	//					nOutOf: {
	//						n: 1,
	//						rules: [{
	//							signedBy: 0
	//						}]
	//					}
	//				}
	//			}
	//		};
	//		stitch.configUpdateJsonToBinary(config_update, (err, bin) => {
	//			const b64_string = stitch.uint8ArrayToBase64(bin);
	//			const s_opts = {
	//				client_cert_b64pem: options.client_cert_b64pem,
	//				client_prv_key_b64pem: options.client_prv_key_b64pem,
	//				protobuf: b64_string,
	//				msp_id: test_msp_id,
	//			};
	//			stitch.signConfigUpdate(s_opts, (err, config_signature_as_b64) => {
	//				const c_opts = {
	//					msp_id: test_msp_id,
	//					client_cert_b64pem: options.client_cert_b64pem,
	//					client_prv_key_b64pem: options.client_prv_key_b64pem,
	//					orderer_host: options.orderer_host,
	//					config_update: b64_string,
	//					config_update_signatures: [config_signature_as_b64],
	//				};
	//				stitch.submitConfigUpdate(c_opts, (err, resp) => {
	//					console.log('?', err);
	//					console.log('!', resp);
	//					common_stitch_ok_fmt(opts, err, resp);
	//					done();
	//				});
	//			});
	//		});
	//	});
	//});

});
