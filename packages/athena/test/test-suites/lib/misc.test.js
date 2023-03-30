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
// misc_test.js - test for the misc lib
//------------------------------------------------------------
const common = require('../common-test-framework.js');
const chai = require('chai');
const expect = chai.expect;
const tools = common.tools;
const misc = require('../../../libs/misc.js')(common.logger, tools);
const filename = tools.path.basename(__filename);
const path_to_current_file = tools.path.join(__dirname + '/' + filename);
const misc_objects = require('../../docs/misc_objects.json');

describe('Misc', () => {
	before(() => { });
	after(() => { });
	const testCollection = [
		// hash_str
		{
			suiteDescribe: 'hash_str',
			mainDescribe: 'Run hash_str',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=jnravw',
							expectBlock: (done) => {
								const hashed = misc.hash_str('abcdef');
								expect(hashed).to.equal(-1424385949);
								done();
							}
						},
						{
							itStatement: 'should return a invalid response - function given invalid arguments  test_id=igkzco',
							expectBlock: (done) => {
								const hashed = misc.hash_str('abcdef');
								expect(hashed).to.not.equal(-1424385940);
								done();
							}
						}
					]
				}
			]
		},
		// friendly_ms
		{
			suiteDescribe: 'friendly_ms',
			mainDescribe: 'Run friendly_ms',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=yopuqc',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms(1542056818);
								expect(hashed).to.equal('17.8 days');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=vvzcyj',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms(1542);
								expect(hashed).to.equal('1.5 secs');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=mzjwex',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms(.15);
								expect(hashed).to.equal('0.1 ms');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=acsyqm',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms(0);
								expect(hashed).to.equal('0 secs');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=znxjpk',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms('?');
								expect(hashed).to.equal('? sec');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=vflmmf',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms(1542056);
								expect(hashed).to.equal('25.7 mins');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=eldhms',
							expectBlock: (done) => {
								const hashed = misc.friendly_ms(15420568);
								expect(hashed).to.equal('4.3 hrs');
								done();
							}
						},
					]
				}
			]
		},
		// b64
		{
			suiteDescribe: 'b64',
			mainDescribe: 'Run b64',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=vccblv',
							expectBlock: (done) => {
								const hashed = misc.b64('abcdef');
								expect(hashed).to.equal('YWJjZGVm');
								done();
							}
						},
						{
							itStatement: 'should return a invalid response - function given invalid arguments  test_id=acsgwv',
							expectBlock: (done) => {
								const hashed = misc.b64('abcdef');
								expect(hashed).to.not.equal(-1424385940);
								done();
							}
						}
					]
				}
			]
		},
		// decodeb64
		{
			suiteDescribe: 'decodeb64',
			mainDescribe: 'Run decodeb64',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=sspstp',
							expectBlock: (done) => {
								const decoded = misc.decodeb64('ab');
								expect(decoded).to.equal('i');
								done();
							}
						},
						{
							itStatement: 'should return a invalid response - function given invalid arguments  test_id=wbnrdc',
							expectBlock: (done) => {
								const decoded = misc.decodeb64('ab');
								expect(decoded).to.not.equal(-1424385940);
								done();
							}
						},
						{
							itStatement: 'should throw an error - no arguments passed in  test_id=cogpje',
							expectBlock: (done) => {
								const res = misc.decodeb64();
								expect(res).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// hexStr2b64
		{
			suiteDescribe: 'hexStr2b64',
			mainDescribe: 'Run hexStr2b64',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments  test_id=pmumdu',
							expectBlock: (done) => {
								const decoded = misc.hexStr2b64('ab');
								expect(decoded).to.equal('qw==');
								done();
							}
						},
						{
							itStatement: 'should return a invalid response - function given invalid arguments  test_id=qdobat',
							expectBlock: (done) => {
								const decoded = misc.hexStr2b64('ab');
								expect(decoded).to.not.equal(-1424385940);
								done();
							}
						},
						{
							itStatement: 'should throw an error - no arguments passed in  test_id=fqobyp',
							expectBlock: (done) => {
								const res = misc.hexStr2b64();
								expect(res).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// formatDate
		{
			suiteDescribe: 'formatDate',
			mainDescribe: 'Run formatDate',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return a valid response - function given valid arguments: PM test_id=vvnhhr',
							expectBlock: (done) => {
								const decoded = misc.formatDate(1542109446, '%Y/%M/%d-%H:%m:%s.%r:%I:%p:%P:%q');
								expect(decoded).to.equal('1970/01/18-20:21:49.446:08:pm:PM:1542109446');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - function given valid arguments: AM  test_id=mibfor',
							expectBlock: (done) => {
								const decoded = misc.formatDate(1642067200, '%Y/%M/%d-%H:%m:%s.%r:%I:%p:%P:%q');
								expect(decoded).to.equal('1970/01/20-00:07:47.200:12:am:AM:1642067200');
								done();
							}
						},
						{
							itStatement: 'should return a valid response - default condition  test_id=dgxynu',
							expectBlock: (done) => {
								const decoded = misc.formatDate(1642067200, '%Z');
								expect(decoded).to.equal('1642067200');
								done();
							}
						},
					]
				}
			]
		},
		// sortItOut
		{
			suiteDescribe: 'sortItOut',
			mainDescribe: 'Run sortItOut',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the sorted object - debug set to false test_id=vfwcvy',
							expectBlock: (done) => {
								const obj = {
									a_prop: 'value1',
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortItOut(obj, false);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ a_prop: 'value1', b_prop: 'value2', c_prop: 'value3', d_prop: 'value4' })
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - debug set to true test_id=dxetwp',
							expectBlock: (done) => {
								const obj = {
									a_prop: 'value1',
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortItOut(obj, true);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ a_prop: 'value1', b_prop: 'value2', c_prop: 'value3', d_prop: 'value4' })
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - "sortMeDummy" has a depth of 1 test_id=hsbaml',
							expectBlock: (done) => {
								const obj = {
									a_prop: { e_prop: 'value1' },
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortItOut(obj, true);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ a_prop: { e_prop: 'value1' }, b_prop: 'value2', c_prop: 'value3', d_prop: 'value4' })
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - "sortMeDummy" gets an array test_id=mjctnz',
							expectBlock: (done) => {
								const obj = {
									a_prop: [{ e_prop: 'value5' }, { f_prop: 'd_prop' }],
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortItOut(obj, true);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({
										a_prop: [
											{ e_prop: 'value5' },
											{ f_prop: 'd_prop' }
										],
										b_prop: 'value2',
										c_prop: 'value3',
										d_prop: 'value4'
									})
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - next array of numbers test_id=nfnsnm',
							expectBlock: (done) => {
								const obj = {
									a_prop: [{ e_prop: [1, 5, 2] }],
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortItOut(obj, true);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ a_prop: [{ e_prop: [1, 2, 5] }], b_prop: 'value2', c_prop: 'value3', d_prop: 'value4' })
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - next array of strings test_id=pjrpqf',
							expectBlock: (done) => {
								const obj = {
									a_prop: [{ e_prop: ['1', '5', '2'] }],
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortItOut(obj, true);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ a_prop: [{ e_prop: ['1', '2', '5'] }], b_prop: 'value2', c_prop: 'value3', d_prop: 'value4' })
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - array of numbers and no objects test_id=aazcfo',
							expectBlock: (done) => {
								const obj = [1, 3, 2, 4, 6];
								const sorted = misc.sortItOut(obj, true);
								expect(JSON.stringify(sorted)).to.equal(JSON.stringify([1, 3, 2, 4, 6]));
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - array of numbers and no objects test_id=vwwqqa',
							expectBlock: (done) => {
								const obj = {};
								let pointer = obj;
								for (let i = 0; i < 3; i++) {
									pointer.nextObj = {};
									pointer = pointer.nextObj;
								}
								expect(JSON.stringify(obj.nextObj)).to.equal(JSON.stringify({ 'nextObj': { 'nextObj': {} } }));
								done();
							}
						},
					]
				}
			]
		},
		// sortKeys
		{
			suiteDescribe: 'sortKeys',
			mainDescribe: 'Run sortKeys',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the sorted object  test_id=gvpmrj',
							expectBlock: (done) => {
								const obj = {
									a_prop: 'value1',
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortKeys(obj);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ a_prop: 'value1', b_prop: 'value2', c_prop: 'value3', d_prop: 'value4' })
								);
								done();
							}
						},
						{
							itStatement: 'should not touch the array of strings - test_id=rniplj',
							expectBlock: (done) => {
								const obj = ['value1', 'value4', 'value2', 'value3'];
								const sorted = misc.sortKeys(obj);
								expect(JSON.stringify(sorted)).to.equal(JSON.stringify(['value1', 'value4', 'value2', 'value3']));
								done();
							}
						},
						{
							itStatement: 'should not touch string - test_id=cpkktd',
							expectBlock: (done) => {
								const str = 'testing';
								const sorted = misc.sortKeys(str);
								expect(sorted).to.equal('testing');
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - sort object\'s object\'s keys  test_id=uxlhna',
							expectBlock: (done) => {
								const obj = {
									a_prop: {
										d_prop: 'value4',
										b_prop: 'value2',
										c_prop: 'value3'
									}
								};
								const sorted = misc.sortKeys(obj);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({ 'a_prop': { 'b_prop': 'value2', 'c_prop': 'value3', 'd_prop': 'value4' } })
								);
								done();
							}
						},
						{
							itStatement: 'should return the sorted object - "sortMeDummy" gets an array test_id=rqubqw',
							expectBlock: (done) => {
								const obj = {
									a_prop: [{ e_prop: 'value5' }, { f_prop: 'd_prop' }],
									d_prop: 'value4',
									b_prop: 'value2',
									c_prop: 'value3'
								};
								const sorted = misc.sortKeys(obj);
								expect(JSON.stringify(sorted)).to.equal(
									JSON.stringify({
										a_prop: [
											{ e_prop: 'value5' },
											{ f_prop: 'd_prop' }
										],
										b_prop: 'value2',
										c_prop: 'value3',
										d_prop: 'value4'
									})
								);
								done();
							}
						},
					]
				}
			]
		},
		// encrypt
		{
			suiteDescribe: 'encrypt',
			mainDescribe: 'Run encrypt',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return an encrypted string  test_id=qvgmkp',
							expectBlock: (done) => {
								const text = 'Here is some text to encrypt';
								const password = 'random';
								const encrypted = misc.encrypt(text, password);
								expect(encrypted).to.equal('d5045081f292bbe92a93f902caf3a753b2329b4e8abaf50ca702eb61');
								done();
							}
						},
						{
							itStatement: 'should return null - cannot encrypt the text/password pair  test_id=xupksb',
							expectBlock: (done) => {
								const text = null;
								const password = 'random';
								const encrypted = misc.encrypt(text, password);
								expect(encrypted).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// decrypt
		{
			suiteDescribe: 'decrypt',
			mainDescribe: 'Run decrypt',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the decrypted string  test_id=dxvexg',
							expectBlock: (done) => {
								const text = 'd5045081f292bbe92a93f902caf3a753b2329b4e8abaf50ca702eb61';
								const password = 'random';
								const encrypted = misc.decrypt(text, password);
								expect(encrypted).to.equal('Here is some text to encrypt');
								done();
							}
						},
						{
							itStatement: 'should return null - cannot decrypt the text/password pair  test_id=yczkli',
							expectBlock: (done) => {
								const text = null;
								const password = 'random';
								const encrypted = misc.decrypt(text, password);
								expect(encrypted).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// rmdir
		{
			suiteDescribe: 'rmdir',
			mainDescribe: 'Run rmdir',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should create a directory with sub-directories and a file, and then delete everything  test_id=pxfxds',
							expectBlock: (done) => {
								const dirPath1 = './delete_me_rmdir';
								const dirPath2 = dirPath1 + '/delete_me_rmdir_2';
								tools.fs.mkdir(dirPath1, () => {
									tools.fs.mkdir(dirPath2, () => {
										tools.fs.writeFile(dirPath2, 'useless text', () => {
											expect(tools.fs.existsSync(dirPath2)).to.equal(true);
											misc.rmdir(dirPath1);
											misc.rmdir(dirPath2);
											expect(tools.fs.existsSync(dirPath2)).to.equal(false);
										});
									});
								});
								done();
							}
						}
					]
				}
			]
		},
		// copy_dir_sync
		{
			suiteDescribe: 'copy_dir_sync',
			mainDescribe: 'Run copy_dir_sync',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should create a directory, copy it, and then delete both  test_id=ejfysc',
							expectBlock: (done) => {
								const dirPath1 = './delete_me_cpy_test';
								const dirPath2 = dirPath1 + '/delete_me2_cpy_test';
								const dirPath3 = './delete_me_copy_cpy_test';
								tools.fs.mkdir(dirPath1, () => {
									expect(tools.fs.existsSync(dirPath1)).to.equal(true);
									tools.fs.mkdir(dirPath2, () => {
										tools.fs.writeFile(dirPath2 + '/temp', 'useless text', () => {
											misc.copy_dir_sync(dirPath2, dirPath3);
											expect(tools.fs.existsSync(dirPath3)).to.equal(true);
											misc.rmdir(dirPath1);
											misc.rmdir(dirPath2);
											misc.rmdir(dirPath3);
											expect(tools.fs.existsSync(dirPath1)).to.equal(false);
											expect(tools.fs.existsSync(dirPath2)).to.equal(false);
											expect(tools.fs.existsSync(dirPath3)).to.equal(false);
										});
									});
								});
								done();
							}
						},
						{
							itStatement: 'should create a directory, copy it, and then delete both - tests path is not a directory error leg  test_id=rquiey',
							expectBlock: (done) => {
								const dirPath1 = './delete_me_cpy_test_2';
								const dirPath2 = dirPath1 + '/delete_me2_cpy_test_2';
								const dirPath3 = './delete_me_copy_cpy_test_2';
								tools.fs.mkdir(dirPath1, () => {
									// expect(tools.fs.existsSync(dirPath1)).to.equal(true);
									tools.fs.mkdir(dirPath2, () => {
										tools.fs.writeFile(dirPath2 + '/temp', 'useless text', () => {
											misc.copy_dir_sync(dirPath2 + '/temp', dirPath3);
											expect(tools.fs.existsSync(dirPath3)).to.equal(false);
											misc.rmdir(dirPath1);
											misc.rmdir(dirPath2);
											misc.rmdir(dirPath3);
											expect(tools.fs.existsSync(dirPath1)).to.equal(false);
											expect(tools.fs.existsSync(dirPath2)).to.equal(false);
											expect(tools.fs.existsSync(dirPath3)).to.equal(false);
										});
									});
								});
								done();
							}
						}
					]
				}
			]
		},
		// move_dir
		{
			suiteDescribe: 'move_dir',
			mainDescribe: 'Run move_dir',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should create a directory, copy it, and then delete both  test_id=ptoxbz',
							expectBlock: (done) => {
								const dirPath1 = './delete_me_move_dir';
								const dirPath2 = './delete_me_moved_move_dir';
								tools.fs.mkdir(dirPath1, () => {
									misc.move_dir(dirPath1, dirPath2);
									expect(tools.fs.existsSync(dirPath2)).to.equal(true);
									misc.rmdir(dirPath2);
									expect(tools.fs.existsSync(dirPath2)).to.equal(false);
								});
								done();
							}
						},
					]
				}
			]
		},
		// watch_this
		{
			suiteDescribe: 'watch_this',
			mainDescribe: 'Run watch_this',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should cause the function to timeout and include description in the error  test_id=jkcodx',
							expectBlock: (done) => {
								const opts = { timeout: 2, description: 'timeout test' };
								const logic = () => { return null; };
								misc.watch_this(opts, logic, (err, resp) => {
									expect(JSON.stringify(err)).to.equal(JSON.stringify({ parsed: 'timeout when timeout test' }));
									expect(resp).to.equal(undefined);
								});
								done();
							}
						},
						{
							itStatement: 'should return an empty object in the error position of the logic function test_id=pzedlo',
							expectBlock: (done) => {
								const opts = { timeout: 2 };
								const logic = (cb) => { return cb({}); };
								misc.watch_this(opts, logic, (err, resp) => {
									expect(JSON.stringify(err)).to.equal(JSON.stringify({}));
									expect(resp).to.equal(undefined);
								});
								done();
							}
						}
					]
				}
			]
		},

		// formatPEM
		{
			suiteDescribe: 'formatPEM',
			mainDescribe: 'Run formatPEM',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return formatted PEM  test_id=ybylpz',
							expectBlock: (done) => {
								const formattedPem = misc.formatPEM(misc_objects.enroll_cert_pem);
								expect(formattedPem).to.equal(misc_objects.enroll_cert_pem_fmt);
								done();
							}
						}
					]
				}
			]
		},
		// formatObjAsQueryParams
		{
			suiteDescribe: 'formatObjAsQueryParams',
			mainDescribe: 'Run formatObjAsQueryParams',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should format the object as query params test_id=gdzjiq',
							expectBlock: (done) => {
								const obj = {
									prop1: 'some string',
									keys: ['test', 'this'],
									prop3: 12345,
									include_docs: true,
								};
								const formatted = misc.formatObjAsQueryParams(obj);
								expect(formatted).to.equal('prop1=some string&keys=["test","this"]&prop3=12345&include_docs=true');
								done();
							}
						}
					]
				}
			]
		},
		// censorEmail
		{
			suiteDescribe: 'censorEmail',
			mainDescribe: 'Run censorEmail',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return censored email - normal email  test_id=fbmdsp',
							expectBlock: (done) => {
								const censoredEmail = misc.censorEmail('user@us.ibm.com');
								expect(censoredEmail).to.equal('u**r@us.ibm.com');
								done();
							}
						},
						{
							itStatement: 'should return censored email - shortish email  test_id=sypanc',
							expectBlock: (done) => {
								const censoredEmail = misc.censorEmail('usr@us.ibm.com');
								expect(censoredEmail).to.equal('u**@us.ibm.com');
								done();
							}
						},
						{
							itStatement: 'should return censored email - short email  test_id=dhecfa',
							expectBlock: (done) => {
								const censoredEmail = misc.censorEmail('us@us.ibm.com');
								expect(censoredEmail).to.equal('**@us.ibm.com');
								done();
							}
						},
						{
							itStatement: 'should return censored email - short email  test_id=sjuxzf',
							expectBlock: (done) => {
								const censoredEmail = misc.censorEmail('u@us.ibm.com');
								expect(censoredEmail).to.equal('*@us.ibm.com');
								done();
							}
						},
						{
							itStatement: 'should return censored email - partial  test_id=rudyqk',
							expectBlock: (done) => {
								const censoredEmail = misc.censorEmail('uus.ibm.com');
								expect(censoredEmail).to.equal('uus.ibm.***');
								done();
							}
						}
					]
				}
			]
		},
		// getEnrollIdFromCert
		{
			suiteDescribe: 'getEnrollIdFromCert',
			mainDescribe: 'Run getEnrollIdFromCert',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the enroll id - valid PEM cert  test_id=tgcgbd',
							expectBlock: (done) => {
								const enrollId = misc.getEnrollIdFromCert(misc_objects.cert);
								expect(enrollId).to.equal('admin');
								done();
							}
						},
						{
							itStatement: 'should return null - invalid PEM cert  test_id=pbjjnk',
							expectBlock: (done) => {
								const enrollId = misc.getEnrollIdFromCert('');
								expect(enrollId).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// get_host
		{
			suiteDescribe: 'get_host',
			mainDescribe: 'Run get_host',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the host - valid url sent  test_id=slatwi',
							expectBlock: (done) => {
								const host = misc.get_host('https://some_url.com');
								expect(host).to.equal('some_url.com');
								done();
							}
						},
						{
							itStatement: 'should return null - invalid url sent  test_id=zhqwhb',
							expectBlock: (done) => {
								const host = misc.get_host('');
								expect(host).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},
		// redact_basic_auth
		{
			suiteDescribe: 'redact_basic_auth',
			mainDescribe: 'Run redact_basic_auth',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return url with redacted basic auth  test_id=fcxefx',
							expectBlock: (done) => {
								const url = misc.redact_basic_auth('http://user:passwd@www.some_url.com:2000');
								expect(url).to.equal('http://www.some_url.com:2000');
								done();
							}
						},
						{
							itStatement: 'should return null - invalid url sent  test_id=nvqkys',
							expectBlock: (done) => {
								const url = misc.redact_basic_auth('');
								expect(url).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},

		// is_equal
		{
			suiteDescribe: 'is_equal',
			mainDescribe: 'Run is_equal',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return that the two json objects are equal -test_id=btiszo',
							expectBlock: (done) => {
								const obj1 = { prop1: 'value1', prop2: 'value2' };
								const obj2 = { prop1: 'value1', prop2: 'value2' };
								expect(misc.is_equal(obj1, obj2)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return that the two json objects are not equal -test_id=qwpywq',
							expectBlock: (done) => {
								const obj1 = { prop1: 'value1', prop2: 'value2' };
								const obj2 = { prop1: 'value3', prop2: 'value2' };
								expect(misc.is_equal(obj1, obj2)).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return that the two json objects are not equal - invalid json - test_id=psjrfu',
							expectBlock: (done) => {
								const obj1 = '';
								const obj2 = [];
								expect(misc.is_equal(obj1, obj2)).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},

		// are_design_docs_equal
		{
			suiteDescribe: 'are_design_docs_equal',
			mainDescribe: 'Run are_design_docs_equal',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return that the two design docs are equal  test_id=olnpkd',
							expectBlock: (done) => {
								const doc1 = {
									'_id': '_design/athena-v1',
									'views': {
										'all': {
											'map': 'function(doc){ if(doc.type && doc.type == \'key_doc\') emit(doc._id, doc)}'
										},
									}
								};
								const doc2 = {
									'_id': '_design/athena-v1',
									'views': {
										'all': {
											'map': 'function(doc){ if(doc.type && doc.type == \'key_doc\') emit(doc._id, doc)}'
										},
									}
								};
								const isEqual = misc.are_design_docs_equal(doc1, doc2);
								expect(isEqual).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return that the two design docs are not equal  test_id=xufijy',
							expectBlock: (done) => {
								const doc1 = {
									'_id': '_design/athena-v1',
									'views': {
										'all': {
											'map': 'function(doc){ if(doc.type && doc.type == \'key_doc\') emit(doc._id, doc)}'
										},
									}
								};
								const doc2 = {
									'_id': '_design/athena-v1',
									'views': {
										'not_all': {
											'map': 'function(doc){ if(doc.type && doc.type == \'key_doc\') emit(doc._id, doc)}'
										},
									}
								};
								const isEqual = misc.are_design_docs_equal(doc1, doc2);
								expect(isEqual).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should return that the two docs are not equal - no docs sent  test_id=zclrod',
							expectBlock: (done) => {
								const isEqual = misc.are_design_docs_equal();
								expect(isEqual).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},

		// safe_dot_nav
		{
			suiteDescribe: 'safe_dot_nav',
			mainDescribe: 'Run safe_dot_nav',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return value from complex object - test_id=dqmgpn',
							expectBlock: (done) => {
								const doc = {
									'views': {
										'all': {
											'map': 'something'
										},
										'arr': ['one', { 'two': 'here2' }]
									}
								};
								expect(misc.safe_dot_nav(doc, 'doc.views.all.map')).to.equal('something');
								expect(JSON.stringify(misc.safe_dot_nav(doc, 'doc.views.all'))).to.equal(JSON.stringify({ 'map': 'something' }));
								expect(misc.safe_dot_nav(doc, 'doc.views.arr.0')).to.equal('one');
								expect(misc.safe_dot_nav(doc, 'doc.views.arr.1.two')).to.equal('here2');
								done();
							}
						},
						{
							itStatement: 'should return array values from object - test_id=banfhw',
							expectBlock: (done) => {
								const doc = {
									'views': {
										'all': {
											'map': 'something'
										},
										'arr': ['one', { 'two': 'here2' }]
									}
								};
								expect(misc.safe_dot_nav(doc, ['doc.views.all.map'])).to.equal('something');
								expect(misc.safe_dot_nav(doc, ['doc.views.fail', 'doc.views.all.map'])).to.equal('something');
								done();
							}
						},
						{
							itStatement: 'should return null - test_id=keputc',
							expectBlock: (done) => {
								const doc = {
									'views': {
										'all': {
											'map': 'something'
										},
										'arr': ['one', { 'two': 'here2' }]
									}
								};
								expect(misc.safe_dot_nav(doc, 'doc.views.fail.1.two')).to.equal(null);
								expect(misc.safe_dot_nav(doc, 'doc.views.all.fail')).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return nothing from string - test_id=oeehcb',
							expectBlock: (done) => {
								const doc = 'invalid';
								expect(misc.safe_dot_nav(doc, 'doc.views.all.map')).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return something from an array - test_id=nklajd',
							expectBlock: (done) => {
								const doc = ['something'];
								expect(misc.safe_dot_nav(doc, 'doc.0')).to.equal('something');
								done();
							}
						},
						{
							itStatement: 'should return null if field missing but no exception -  test_id=yameuv',
							expectBlock: (done) => {
								const doc = {
									'views': {
										'all': {
											'map': 'something'
										},
										'arr': ['one', { 'two': 'here2' }]
									}
								};
								expect(misc.safe_dot_nav(doc, 'doc.something')).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return value from object if first path is missing - test_id=kxvcgq',
							expectBlock: (done) => {
								const doc = {
									'views': {
										'arr': ['one', { 'two': 'here2' }]
									}
								};
								expect(misc.safe_dot_nav(doc, ['doc.something', 'doc.views.arr.1.two'])).to.equal('here2');
								done();
							}
						},
						{
							itStatement: 'should return value from object with array notation - test_id=ahppav',
							expectBlock: (done) => {
								const doc = {
									'views': {
										'arr': ['one', { 'two': 'here2' }]
									}
								};
								expect(misc.safe_dot_nav(doc, ['doc.views.arr[1].two'])).to.equal('here2');
								done();
							}
						},
					]
				}
			]
		},

		//  format_url
		{
			suiteDescribe: 'format_url',
			mainDescribe: 'Run format_url',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return the url - http so defaults to port 80 test_id=piyjaw',
							expectBlock: (done) => {
								const resp = misc.format_url('http://blockchain.com');
								expect(resp).to.equal('http://blockchain.com:80');
								done();
							}
						},
						{
							itStatement: 'should return the url - no protocol or port defaults to http and port 80 test_id=pveaqp',
							expectBlock: (done) => {
								const resp = misc.format_url('://blockchain.com');
								expect(resp).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'should return the url - no protocol or port test_id=muixgi',
							expectBlock: (done) => {
								const resp = misc.format_url('blockchain.com');
								expect(resp).to.equal('https://blockchain.com:443');
								done();
							}
						},
						{
							itStatement: 'should return the url - https so defaults to port 443 test_id=pkfecu',
							expectBlock: (done) => {
								const resp = misc.format_url('https://blockchain.com');
								expect(resp).to.equal('https://blockchain.com:443');
								done();
							}
						},
						{
							itStatement: 'should return the url - port and auth sent in test_id=arawnj',
							expectBlock: (done) => {
								const resp = misc.format_url('http://admin:pass@blockchain.com:3000');
								expect(resp).to.equal('http://admin:pass@blockchain.com:3000');
								done();
							}
						},
						{
							itStatement: 'should return the url - port and auth sent in test_id=tpjrty',
							expectBlock: (done) => {
								const resp = misc.format_url('admin:pass@blockchain.com');
								expect(resp).to.equal('https://admin:pass@blockchain.com:443');
								done();
							}
						},
						{
							itStatement: 'should return null - no url passed in to parse test_id=jmqngh',
							expectBlock: (done) => {
								const resp = misc.format_url();
								expect(resp).to.equal(null);
								done();
							}
						}
					]
				}
			]
		},

		//  normalize_bytes
		{
			suiteDescribe: 'normalize_bytes',
			mainDescribe: 'Run normalize_bytes',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'given base 2 units return correct number of bytes test_id=qshdja',
							expectBlock: (done) => {
								const Ti = misc.normalize_bytes('123Ti');
								expect(Ti).to.equal(135239930216448);
								const Gi = misc.normalize_bytes('3Gi');
								expect(Gi).to.equal(3221225472);
								const Mi = misc.normalize_bytes('1Mi');
								expect(Mi).to.equal(1048576);
								const Ki = misc.normalize_bytes('200Ki');
								expect(Ki).to.equal(204800);
								done();
							}
						},
						{
							itStatement: 'given base 10 units return correct number of bytes test_id=vcvcer',
							expectBlock: (done) => {
								const TB = misc.normalize_bytes('123TB');
								expect(TB).to.equal(123000000000000);
								const GB = misc.normalize_bytes('3GB');
								expect(GB).to.equal(3000000000);
								const MB = misc.normalize_bytes('1MB');
								expect(MB).to.equal(1000000);
								const KB = misc.normalize_bytes('200KB');
								expect(KB).to.equal(200000);
								const B = misc.normalize_bytes('8B');
								expect(B).to.equal(8);
								done();
							}
						},
						{
							itStatement: 'given short hand base 10 units return correct number of bytes test_id=igwyhh',
							expectBlock: (done) => {
								const T = misc.normalize_bytes('123TB');
								expect(T).to.equal(123000000000000);
								const G = misc.normalize_bytes('3GB');
								expect(G).to.equal(3000000000);
								const M = misc.normalize_bytes('1MB');
								expect(M).to.equal(1000000);
								const K = misc.normalize_bytes('200KB');
								expect(K).to.equal(200000);
								done();
							}
						},
						{
							itStatement: 'given long hand base 2 units return correct number of bytes test_id=fmwulf',
							expectBlock: (done) => {
								const TiB = misc.normalize_bytes('123TiB');
								expect(TiB).to.equal(135239930216448);
								const GiB = misc.normalize_bytes('3GiB');
								expect(GiB).to.equal(3221225472);
								const MiB = misc.normalize_bytes('1MiB');
								expect(MiB).to.equal(1048576);
								const KiB = misc.normalize_bytes('200KiB');
								expect(KiB).to.equal(204800);
								done();
							}
						},
						{
							itStatement: 'given base 2 units with fractions return correct number of bytes test_id=fhodtm',
							expectBlock: (done) => {
								const Ti = misc.normalize_bytes('12.3Ti');
								expect(Ti).to.equal(13523993021645);
								const Gi = misc.normalize_bytes('3.0Gi');
								expect(Gi).to.equal(3221225472);
								const Mi = misc.normalize_bytes('1.5Mi');
								expect(Mi).to.equal(1572864);
								const Ki = misc.normalize_bytes('2.01Ki');
								expect(Ki).to.equal(2059);
								done();
							}
						},
						{
							itStatement: 'given a negative number return true test_id=loxmja',
							expectBlock: (done) => {
								const Ti = misc.invalid_bytes_value('-12.3Ti');
								expect(Ti).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'given a bad number return null test_id=hudvtm',
							expectBlock: (done) => {
								const test1 = misc.normalize_bytes('dale will never see this');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_bytes(false);
								expect(test2).to.equal(null);
								const test4 = misc.normalize_bytes({ what: 123 });
								expect(test4).to.equal(null);
								const test5 = misc.normalize_bytes(Infinity);
								expect(test5).to.equal(null);
								const test6 = misc.normalize_bytes(Number.MAX_VALUE);
								expect(test6).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'given unknown units return null test_id=uoxagg',
							expectBlock: (done) => {
								const test1 = misc.normalize_bytes('100chicks');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_bytes('100chicksTB');
								expect(test2).to.equal(null);
								const test3 = misc.normalize_bytes('100TB_');
								expect(test3).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'given no units return number test_id=jovizw',
							expectBlock: (done) => {
								const test1 = misc.normalize_bytes('100');
								expect(test1).to.equal(100);
								const test2 = misc.normalize_bytes(123);
								expect(test2).to.equal(123);
								const test3 = misc.normalize_bytes(0);
								expect(test3).to.equal(0);
								const test4 = misc.normalize_bytes('-0');
								expect(test4).to.equal(0);
								done();
							}
						},
					]
				}
			]
		},

		//  normalize_cpu
		{
			suiteDescribe: 'normalize_cpu',
			mainDescribe: 'Run normalize_cpu',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'given number return correct number  test_id=vvyoym',
							expectBlock: (done) => {
								const test1 = misc.normalize_cpu('123m');
								expect(test1).to.equal(0.123);
								const test2 = misc.normalize_cpu('1m');
								expect(test2).to.equal(0.001);
								const test3 = misc.normalize_cpu('1525m');
								expect(test3).to.equal(1.525);
								expect(misc.normalize_cpu('0m')).to.equal(0);
								done();
							}
						},
						{
							itStatement: 'given a negative number return true test_id=loxmja',
							expectBlock: (done) => {
								const test1 = misc.invalid_cpu_value('-123m');
								expect(test1).to.equal(true);
								const test2 = misc.invalid_cpu_value(-10);
								expect(test2).to.equal(true);
								const test3 = misc.invalid_cpu_value('-5');
								expect(test3).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'given a bad number return null test_id=hudvtm',
							expectBlock: (done) => {
								const test1 = misc.normalize_cpu('dale will never see this');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_cpu(false);
								expect(test2).to.equal(null);
								const test4 = misc.normalize_cpu({ what: 123 });
								expect(test4).to.equal(null);
								const test5 = misc.normalize_cpu(Infinity);
								expect(test5).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'given unknown units return null test_id=uoxagg',
							expectBlock: (done) => {
								const test1 = misc.normalize_cpu('100chicks');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_cpu('100chicksm');
								expect(test2).to.equal(null);
								const test3 = misc.normalize_cpu('100m_');
								expect(test3).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'given no units return number test_id=jovizw',
							expectBlock: (done) => {
								const test1 = misc.normalize_cpu('100');
								expect(test1).to.equal(100);
								const test2 = misc.normalize_cpu(123);
								expect(test2).to.equal(123);
								const test3 = misc.normalize_cpu(0);
								expect(test3).to.equal(0);
								done();
							}
						},
						{
							itStatement: 'given nano cpu return correct cpu number test_id=xtdcfd',
							expectBlock: (done) => {
								expect(misc.normalize_cpu('123n')).to.equal(0.000000123);
								expect(misc.normalize_cpu('8n')).to.equal(0.000000008);
								expect(misc.normalize_cpu('1000 n')).to.equal(0.000001);

								expect(misc.normalize_cpu('123nanoCPU')).to.equal(0.000000123);
								expect(misc.normalize_cpu('8nanoCPU')).to.equal(0.000000008);
								expect(misc.normalize_cpu('1000 nanoCPU')).to.equal(0.000001);
								done();
							}
						},
						{
							itStatement: 'given micro cpu return correct cpu number test_id=yonqej',
							expectBlock: (done) => {
								expect(misc.normalize_cpu('123u')).to.equal(0.000123);
								expect(misc.normalize_cpu('1u')).to.equal(0.000001);
								expect(misc.normalize_cpu('1000 u')).to.equal(0.001);

								expect(misc.normalize_cpu('123microCPU')).to.equal(0.000123);
								expect(misc.normalize_cpu('1microCPU')).to.equal(0.000001);
								expect(misc.normalize_cpu('1000 microCPU')).to.equal(0.001);
								done();
							}
						},
						{
							itStatement: 'given milli cpu return correct cpu number test_id=wbxxlm',
							expectBlock: (done) => {
								expect(misc.normalize_cpu('123m')).to.equal(0.123);
								expect(misc.normalize_cpu('1m')).to.equal(0.001);
								expect(misc.normalize_cpu('1000 m')).to.equal(1);

								expect(misc.normalize_cpu('123milliCPU')).to.equal(0.123);
								expect(misc.normalize_cpu('1milliCPU')).to.equal(0.001);
								expect(misc.normalize_cpu('1000 milliCPU')).to.equal(1);
								done();
							}
						},
						{
							itStatement: 'given cpu return correct cpu number test_id=dupzbp',
							expectBlock: (done) => {
								expect(misc.normalize_cpu('123')).to.equal(123);
								expect(misc.normalize_cpu('1')).to.equal(1);
								expect(misc.normalize_cpu('1000 ')).to.equal(1000);

								expect(misc.normalize_cpu('123CPU')).to.equal(123);
								expect(misc.normalize_cpu('1CPU')).to.equal(1);
								expect(misc.normalize_cpu('1000 CPU')).to.equal(1000);
								done();
							}
						},
					]
				}
			]
		},

		//  normalize_duration
		{
			suiteDescribe: 'normalize_duration',
			mainDescribe: 'Run normalize_duration',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'given single unit duration return correct amount in ns test_id=bftsba',
							expectBlock: (done) => {
								const test1 = misc.normalize_duration('1h');
								expect(test1).to.equal(3.6e12);
								const test2 = misc.normalize_duration('10s');
								expect(test2).to.equal(1e10);
								const test3 = misc.normalize_duration('11ms');
								expect(test3).to.equal(1.1e7);
								const test4 = misc.normalize_duration('12us');
								expect(test4).to.equal(12000);
								const test5 = misc.normalize_duration('13µs');
								expect(test5).to.equal(13000);
								const test6 = misc.normalize_duration('13ns');
								expect(test6).to.equal(13);
								const test7 = misc.normalize_duration('13.4µs');
								expect(test7).to.equal(13400);
								done();
							}
						},
						{
							itStatement: 'given multi unit duration return correct amount in ns test_id=yhrdul',
							expectBlock: (done) => {
								const test1 = misc.normalize_duration('1h1s1ms');
								expect(test1).to.equal(3601001000000);
								const test2 = misc.normalize_duration('10s11ms0.8us');
								expect(test2).to.equal(10011000800);
								const test3 = misc.normalize_duration('1ms123ns');
								expect(test3).to.equal(1000123);
								const test4 = misc.normalize_duration('12us1ns');
								expect(test4).to.equal(12001);
								const test5 = misc.normalize_duration('1.3µs20ns');
								expect(test5).to.equal(1320);
								done();
							}
						},
						{
							itStatement: 'given negative duration return negative amount in ns test_id=bwidxx',
							expectBlock: (done) => {
								const test1 = misc.normalize_duration('-1h');
								expect(test1).to.equal(-3600000000000);
								const test2 = misc.normalize_duration('-10s');
								expect(test2).to.equal(-10000000000);
								done();
							}
						},
						{
							itStatement: 'given bad duration return null test_id=ksohtn',
							expectBlock: (done) => {
								const test1 = misc.normalize_duration('dale will never see this');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_duration(false);
								expect(test2).to.equal(null);
								const test3 = misc.normalize_duration({ what: 123 });
								expect(test3).to.equal(null);
								const test4 = misc.normalize_duration(Infinity);
								expect(test4).to.equal(null);
								const test5 = misc.normalize_duration('13');
								expect(test5).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'given unknown duration units return null test_id=hnrodq',
							expectBlock: (done) => {
								const test1 = misc.normalize_duration('100chicks');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_duration('100m_');
								expect(test2).to.equal(null);
								done();
							}
						},
						{
							itStatement: 'given duration w/no units return null test_id=fifcuj',
							expectBlock: (done) => {
								const test1 = misc.normalize_duration('100');
								expect(test1).to.equal(null);
								const test2 = misc.normalize_duration('1');
								expect(test2).to.equal(null);
								done();
							}
						},
					]
				}
			]
		},

		//  lc_object_keys_rec
		{
			suiteDescribe: 'lc_object_keys_rec',
			mainDescribe: 'Run lc_object_keys_rec',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should convert simple obj to have lowercase keys - test_id=cycenm',
							expectBlock: (done) => {
								const orig_obj = {
									Test: 'THIS',
									lowercase: 'lowercase',
									UPPERCASE: 'UPPERCASE',
									CamelCase: 'CamelCase',
									HaCkZ0rCaS3: 'HaCkZ0rCaS3'
								};
								const lc_obj = misc.lc_object_keys_rec(orig_obj);
								expect(JSON.stringify(lc_obj)).to.equal(JSON.stringify({
									test: 'THIS',
									lowercase: 'lowercase',
									uppercase: 'UPPERCASE',
									camelcase: 'CamelCase',
									hackz0rcas3: 'HaCkZ0rCaS3'
								}));
								done();
							}
						},
						{
							itStatement: 'should convert nested objs to have lowercase keys - test_id=sijyjz',
							expectBlock: (done) => {
								const orig_obj = {
									Test: {
										lowercase: {
											Test: 'THIS',
											lowercase: 'lowercase',
											UPPERCASE: 'UPPERCASE',
											CamelCase: 'CamelCase',
											HaCkZ0rCaS3: 'HaCkZ0rCaS3'
										},
										UPPERCASE: {
											HaCkZ0rCaS3: {
												Test: 'THIS',
												lowercase: 'lowercase',
												UPPERCASE: 'UPPERCASE',
												CamelCase: 'CamelCase',
												HaCkZ0rCaS3: {
													Test: 'THIS',
													lowercase: 'lowercase',
													UPPERCASE: 'UPPERCASE',
													CamelCase: 'CamelCase',
													HaCkZ0rCaS3: 'HaCkZ0rCaS3'
												}
											}
										}
									}
								};
								const lc_obj = misc.lc_object_keys_rec(orig_obj);
								expect(JSON.stringify(lc_obj)).to.equal(JSON.stringify({
									test: {
										lowercase: {
											test: 'THIS',
											lowercase: 'lowercase',
											uppercase: 'UPPERCASE',
											camelcase: 'CamelCase',
											hackz0rcas3: 'HaCkZ0rCaS3'
										},
										uppercase: {
											hackz0rcas3: {
												test: 'THIS',
												lowercase: 'lowercase',
												uppercase: 'UPPERCASE',
												camelcase: 'CamelCase',
												hackz0rcas3: {
													test: 'THIS',
													lowercase: 'lowercase',
													uppercase: 'UPPERCASE',
													camelcase: 'CamelCase',
													hackz0rcas3: 'HaCkZ0rCaS3'
												}
											}
										}
									}
								}));
								done();
							}
						},
						{
							itStatement: 'should convert simple obj w/array to have lowercase keys -  test_id=kobbqu',
							expectBlock: (done) => {
								const orig_obj = {
									Test: ['THIS', { UPPERCASE: 'UPPERCASE' }]
								};
								const lc_obj = misc.lc_object_keys_rec(orig_obj);
								expect(JSON.stringify(lc_obj)).to.equal(JSON.stringify({
									test: ['THIS', { uppercase: 'UPPERCASE' }]
								}));
								done();
							}
						},
					]
				}
			]
		},
		//  lc_object_keys
		{
			suiteDescribe: 'lc_object_keys',
			mainDescribe: 'Run lc_object_keys',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should convert simple obj w/o deep copy test_id=pggtwn',
							expectBlock: (done) => {
								const orig_obj = {
									Test: {
										lowercase: 'lowercase',
									}
								};
								const lc_obj = misc.lc_object_keys(orig_obj, false);
								orig_obj.Test.addition = true;
								expect(JSON.stringify(lc_obj)).to.equal(JSON.stringify({
									test: {
										lowercase: 'lowercase',
										addition: true					// property on orig should appear if clone was not used
									}
								}));
								done();
							}
						},
						{
							itStatement: 'should convert simple obj w/deep copy test_id=byrofi',
							expectBlock: (done) => {
								const orig_obj = {
									Test: {
										lowercase: 'lowercase',
									}
								};
								const lc_obj = misc.lc_object_keys(orig_obj, true);
								orig_obj.Test.addition = true;
								expect(JSON.stringify(lc_obj)).to.equal(JSON.stringify({
									test: {
										lowercase: 'lowercase',
										// property on orig should NOT appear if deep copy was used
									}
								}));
								done();
							}
						},
					]
				}
			]
		},

		//  url_join
		{
			suiteDescribe: 'url_join',
			mainDescribe: 'Run url_join',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should join urls - extra slashes test_id=rcmvqa',
							expectBlock: (done) => {
								const route = misc.url_join(['/api/v2/', '/something/']);
								expect(route).to.equal('/api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - 0 front test_id=hpmpqd',
							expectBlock: (done) => {
								const route = misc.url_join(['api/v2/', '/something/']);
								expect(route).to.equal('api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - 0 end test_id=dhxypc',
							expectBlock: (done) => {
								const route = misc.url_join(['/api/v2/', '/something']);
								expect(route).to.equal('/api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - leading duplicate typo test_id=slpkva',
							expectBlock: (done) => {
								const route = misc.url_join(['/api/v2/', '//something']);
								expect(route).to.equal('/api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - middle duplicate typo test_id=sogtze',
							expectBlock: (done) => {
								const route = misc.url_join(['/api//v2/', '/something']);
								expect(route).to.equal('/api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - trailing duplicate typo test_id=pzoowh',
							expectBlock: (done) => {
								const route = misc.url_join(['/api//v2/', 'something//']);
								expect(route).to.equal('/api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - relative test_id=pugbnx',
							expectBlock: (done) => {
								const route = misc.url_join(['../api/v2/', '/something']);
								expect(route).to.equal('../api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - no extras test_id=imxkel',
							expectBlock: (done) => {
								const route = misc.url_join(['api/v2', 'something']);
								expect(route).to.equal('api/v2/something');
								done();
							}
						},
						{
							itStatement: 'should join urls - triple test_id=jopwzj',
							expectBlock: (done) => {
								const route = misc.url_join(['api/v2', 'something', '/else']);
								expect(route).to.equal('api/v2/something/else');
								done();
							}
						},
						{
							itStatement: 'should join urls - single test_id=bweeaz',
							expectBlock: (done) => {
								const route = misc.url_join(['api/v2']);
								expect(route).to.equal('api/v2');
								done();
							}
						},
						{
							itStatement: 'should join urls - no slashes test_id=xbmrge',
							expectBlock: (done) => {
								const route = misc.url_join(['api']);
								expect(route).to.equal('api');
								done();
							}
						},
						{
							itStatement: 'invalid join urls - test_id=ymawze',
							expectBlock: (done) => {
								const route = misc.url_join('broken');
								expect(route).to.equal('broken');
								done();
							}
						}
					]
				}
			]
		},

		//  is_version_b_greater_than_a
		{
			suiteDescribe: 'is_version_b_greater_than_a',
			mainDescribe: 'Run is_version_b_greater_than_a',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should show that a higher major version is higher test_id=utgysv',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.0.0', '2.0.0')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.2.3', '2.4.5')).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should show that a higher minor version is higher test_id=ozthpy',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.0.0', '1.1.0')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.2.3', '1.3.4')).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should show that a higher patch version is higher test_id=dafpcj',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.0.0', '1.0.1')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.2.3', '1.2.4')).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should show that equal versions are not higher test_id=wnocrm',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.0.0', '1.0.0')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('2.5.1', '2.5.1')).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should show that double digit versions are higher test_id=vryiup',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.0.0', '10.0.0')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('2.5.1', '20.5.1')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.0.0', '1.10.0')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.0.0', '1.0.10')).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should show that lower versions are lower test_id=jmydkt',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('3.1.2', '0.0.0')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('3.1.2', '2.50.1')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('3.1.2', '1.10.1')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('3.1.2', '1.0.100')).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should show that lower versions are lower with dashes test_id=djrade',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('3.1.2-0', '0.0.0-9')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('3.1.2-0', '4.0.0-9')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.2.3-4', '1.2.3-4')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('1.2.3-4', '1.2.3-5')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.2.3-4', '1.2.4-0')).to.equal(true);
								done();
							}
						},

						{
							itStatement: 'should show that lower versions are lower with dashes and non dashes test_id=ledwid',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.4.9', '1.4.9-1')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.4.9', '1.4.9-0')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('1.4.9', '2.4.9-1')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.4.9', '2.4.9-0')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.4.9-1', '1.4.9')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('1.4.9-0', '1.4.9')).to.equal(false);
								done();
							}
						},

						{
							itStatement: 'should show that lower versions are lower with double digits test_id=qqhlve',
							expectBlock: (done) => {
								expect(misc.is_version_b_greater_than_a('1.4.9', '1.4.12')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.4.9', '1.4.10')).to.equal(true);
								expect(misc.is_version_b_greater_than_a('1.4.9', '1.4.01')).to.equal(false);

								expect(misc.is_version_b_greater_than_a('1.4.80', '1.4.9')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('1.4.90', '1.4.8')).to.equal(false);
								expect(misc.is_version_b_greater_than_a('1.4.90', '1.4.01')).to.equal(false);
								done();
							}
						},
					]
				}
			]
		},

		//  get_highest_version
		{
			suiteDescribe: 'get_highest_version',
			mainDescribe: 'Run get_highest_version',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return highest version test_id=bpgipm',
							expectBlock: (done) => {
								expect(misc.get_highest_version(['3.1.2', '0.0.0'])).to.equal('3.1.2');
								expect(misc.get_highest_version(['3.1.2', '2.50.1'])).to.equal('3.1.2');
								expect(misc.get_highest_version(['3.1.2', '1.10.1'])).to.equal('3.1.2');
								expect(misc.get_highest_version(['3.1.2', '1.0.100'])).to.equal('3.1.2');
								expect(misc.get_highest_version(['3.1.2', '4.0.0'])).to.equal('4.0.0');
								done();
							}
						},
						{
							itStatement: 'should return highest version with dashes test_id=usksds',
							expectBlock: (done) => {
								expect(misc.get_highest_version(['3.1.2-0', '0.0.0-9'])).to.equal('3.1.2-0');
								expect(misc.get_highest_version(['3.1.2-0', '4.0.0-9'])).to.equal('4.0.0-9');
								expect(misc.get_highest_version(['1.2.3-4', '1.2.3-4'])).to.equal('1.2.3-4');
								expect(misc.get_highest_version(['1.2.3-4', '1.2.3-5'])).to.equal('1.2.3-5');
								expect(misc.get_highest_version(['1.2.3-4', '1.2.3-0'])).to.equal('1.2.3-4');
								done();
							}
						},
					]
				}
			]
		},

		//  version_matches_pattern
		{
			suiteDescribe: 'version_matches_pattern',
			mainDescribe: 'Run version_matches_pattern',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should return matches, no dashes test_id=fxpmza',
							expectBlock: (done) => {
								expect(misc.version_matches_pattern('1.4.x', '1.4.1')).to.equal(true);
								expect(misc.version_matches_pattern('1.4.x', '1.4.20')).to.equal(true);
								expect(misc.version_matches_pattern('v1.4.x', 'v1.4.1')).to.equal(true);
								expect(misc.version_matches_pattern('v1.4.x', 'v1.4.20')).to.equal(true);
								expect(misc.version_matches_pattern('v1.4.x', 'v1.4')).to.equal(true);
								expect(misc.version_matches_pattern('1.x.0', '1.0.0')).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should return matches, with dashes test_id=tsffwj',
							expectBlock: (done) => {
								expect(misc.version_matches_pattern('1.4.x-1', '1.4.1-2')).to.equal(true);
								expect(misc.version_matches_pattern('1.4.x-1', '1.4.220-2')).to.equal(true);
								expect(misc.version_matches_pattern('v1.4.x-1', 'v1.4.1-2')).to.equal(true);
								expect(misc.version_matches_pattern('v1.4.x-1', 'v1.4.20-2')).to.equal(true);
								expect(misc.version_matches_pattern('v1.4.x-1', 'v1.4-2')).to.equal(true);
								expect(misc.version_matches_pattern('2.2.x', '2.2.8-3')).to.equal(true);
								expect(misc.version_matches_pattern('2.2.8-x', '2.2.8-3')).to.equal(true);
								expect(misc.version_matches_pattern('2.2.8-3', '2.2.8-3')).to.equal(true);
								expect(misc.version_matches_pattern('2.0.x', 2)).to.equal(true);
								expect(misc.version_matches_pattern('2.2.x', 2.2)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should not return matches, no dashes test_id=khvzxc',
							expectBlock: (done) => {
								expect(misc.version_matches_pattern('1.4.x', '1.5.1')).to.equal(false);
								expect(misc.version_matches_pattern('1.4.x', '1.5.20')).to.equal(false);
								expect(misc.version_matches_pattern('v1.4.x', 'v1.5.1')).to.equal(false);
								expect(misc.version_matches_pattern('v1.4.x', 'v1.5.20')).to.equal(false);
								expect(misc.version_matches_pattern('v1.4.x', 'v1.5')).to.equal(false);
								expect(misc.version_matches_pattern('1.x.0', '2.0.0')).to.equal(false);
								expect(misc.version_matches_pattern('2.2.x', 2.0)).to.equal(false);
								done();
							}
						},
					]
				}
			]
		},

		//  forced_array
		{
			suiteDescribe: 'forced_array',
			mainDescribe: 'Run forced_array',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should convert string to array of strings test_id=eadsko',
							expectBlock: (done) => {
								expect(misc.forced_array('testing')).to.deep.equal(['testing']);
								done();
							}
						},
						{
							itStatement: 'should convert object to array of objects test_id=uovvfo',
							expectBlock: (done) => {
								expect(misc.forced_array({ 'testing': 'stuff' })).to.deep.equal([{ 'testing': 'stuff' }]);
								done();
							}
						},
						{
							itStatement: 'should convert null to undefined test_id=nuowom',
							expectBlock: (done) => {
								expect(misc.forced_array(null)).to.deep.equal(undefined);
								done();
							}
						},
						{
							itStatement: 'should leave array as is test_id=zzjbvh',
							expectBlock: (done) => {
								expect(misc.forced_array(['testing'])).to.deep.equal(['testing']);
								done();
							}
						},
					]
				}
			]
		},

		// format_ip
		{
			suiteDescribe: 'format_ip',
			mainDescribe: 'Run format_ip',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should find ip from simple ip - test_id=bimzkl',
							expectBlock: (done) => {
								expect(misc.format_ip('localhost')).to.equal('localhost');
								expect(misc.format_ip('127.0.0.1')).to.equal('localhost');
								expect(misc.format_ip('192.168.1.1')).to.equal('192.168.1.1');
								done();
							}
						},
						{
							itStatement: 'should find ip from gibberish ip - test_id=lstmsr',
							expectBlock: (done) => {
								expect(misc.format_ip('::1')).to.equal('localhost');
								expect(misc.format_ip('::ffff:127.0.0.1')).to.equal('localhost');
								expect(misc.format_ip('::ffff:192.168.1.1')).to.equal('192.168.1.1');
								done();
							}
						},
						{
							itStatement: 'should find ip from array of ips - test_id=dclowj',
							expectBlock: (done) => {
								expect(misc.format_ip(['192.168.1.1', '127.0.0.1'])).to.equal('localhost');
								expect(misc.format_ip(['127.0.0.1', '192.168.1.1'])).to.equal('192.168.1.1');
								expect(misc.format_ip(['127.1.2.3', '::ffff:127.0.0.1'])).to.equal('localhost');
								done();
							}
						}
					]
				}
			]
		},

		// safe_str
		{
			suiteDescribe: 'safe_str',
			mainDescribe: 'Run safe_str',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should leave str alone - test_id=qmzubx',
							expectBlock: (done) => {
								const str = 'hello there 0123456789-_*!@$%&()';
								expect(misc.safe_str(str)).to.equal(str);
								done();
							}
						},
						{
							itStatement: 'should edit malicious str - test_id=ymmbus',
							expectBlock: (done) => {
								const str = 'hi<script>alert(\'hey\');</script>asdf012345';
								expect(misc.safe_str(str)).to.equal('hiscriptalert(hey)scriptasdf0123');
								done();
							}
						},
						{
							itStatement: 'should return fallback string - test_id=avswqb',
							expectBlock: (done) => {
								expect(misc.safe_str({})).to.equal('[-string redacted-]');
								done();
							}
						},
						{
							itStatement: 'should return a safe string - test_id=fucwch',
							expectBlock: (done) => {
								expect(misc.safe_str('this . sentence. had. dots. and "quotes" \'!\'', true)).to.equal('this . sentence. had. dots. and "quotes" !');
								done();
							}
						}
					]
				}
			]
		},

		// safe_jwt_str
		{
			suiteDescribe: 'safe_jwt_str',
			mainDescribe: 'Run safe_jwt_str',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should leave jwt alone - test_id=hgvhqi',
							expectBlock: (done) => {
								const jwt = 'eyJraWQiOiIyMDIwMDkyMjE4MzMiLCJhbGciOiJSUzI1NiJ9.eyJpYW1faWQiOiJJQk1pZC0yp00iiXX0.' +
									'P5ale38vMl0ufyZ2iEZZkp-J-jFvLf_jAz2D2_JoUJujDBc38-oRjF7F5UA_BAVUHeExRp-8i8Pb_6TbjFQ_mPBytRj6yO-FZ57';
								expect(misc.safe_jwt_str(jwt)).to.equal(jwt);

								const jwt2 = 'abcd+/==.something.dahs-dot0123456789_';
								expect(misc.safe_jwt_str(jwt2)).to.equal(jwt2);
								done();
							}
						},
						{
							itStatement: 'should edit malformed jwt - test_id=onfeqw',
							expectBlock: (done) => {
								const jwt = 'eyJraMDkyM<script>alert(\'hey\');</script>jE4M9.eyJ0';
								expect(misc.safe_jwt_str(jwt)).to.equal('eyJraMDkyMscriptalerthey/scriptjE4M9.eyJ0');
								done();
							}
						},
						{
							itStatement: 'should return fallback jwt string - test_id=tzabyi',
							expectBlock: (done) => {
								expect(misc.safe_jwt_str({})).to.equal('');
								done();
							}
						}
					]
				}
			]
		},

		// safe_username_str
		{
			suiteDescribe: 'safe_username_str',
			mainDescribe: 'Run safesafe_username_str_jwt_str',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should leave username alone - test_id=sywwof',
							expectBlock: (done) => {
								const user = 'dshuffma@us.ibm.com';
								expect(misc.safe_username_str(user)).to.equal(user);

								const user2 = 'hello-there-guy!';
								expect(misc.safe_username_str(user2)).to.equal(user2);
								done();
							}
						},
						{
							itStatement: 'should edit username jwt - test_id=hgxbpr',
							expectBlock: (done) => {
								const user = 'dshuffma<script>alert(\'hey:hi\');</script>@us.ibm.com';
								expect(misc.safe_username_str(user)).to.equal('dshuffmascriptalert(heyhi);/script@us.ibm.com');
								done();
							}
						},
						{
							itStatement: 'should return fallback user string - test_id=blxbhl',
							expectBlock: (done) => {
								expect(misc.safe_username_str({})).to.equal('');
								done();
							}
						}
					]
				}
			]
		},

		// is_different
		{
			suiteDescribe: 'is_different',
			mainDescribe: 'Run is_different',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should detect vars as the same - test_id=eeyoke',
							expectBlock: (done) => {
								const str1 = 'this is a str';
								const str2 = 'this is a str';
								expect(misc.is_different(str1, str2)).to.equal(false);

								const number1 = 5;
								const number2 = 5;
								expect(misc.is_different(number1, number2)).to.equal(false);

								const arr1 = ['test', 'abc'];
								const arr2 = ['test', 'abc'];
								expect(misc.is_different(arr1, arr2)).to.equal(false);

								const obj1 = { thing: 'abc', second: 'abc' };
								const obj2 = { second: 'abc', thing: 'abc' };	// order should not matter
								expect(misc.is_different(obj1, obj2)).to.equal(false);
								done();
							}
						},
						{
							itStatement: 'should detect vars as different - test_id=fjqxkh',
							expectBlock: (done) => {
								const str1 = 'this is a str';
								const str2 = 'this is b str';
								expect(misc.is_different(str1, str2)).to.equal(true);

								const number1 = 5;
								const number2 = 0;
								expect(misc.is_different(number1, number2)).to.equal(true);

								const arr1 = ['test', 'abc'];
								const arr2 = ['abc', 'abc'];
								expect(misc.is_different(arr1, arr2)).to.equal(true);

								const obj1 = { thing: 'abc', second: 'abc' };
								const obj2 = { second: 'asd', thing: 'abc' };
								expect(misc.is_different(obj1, obj2)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should correctly judge var as different or not (edge cases) - test_id=wjdxwz',
							expectBlock: (done) => {
								const nothing1 = null;
								const nothing2 = '';								// these are NOT the same thing
								expect(misc.is_different(nothing1, nothing2)).to.equal(true);

								const number1 = 5;
								const number2 = '5';
								expect(misc.is_different(number1, number2)).to.equal(true);

								const nothing3 = null;
								const nothing4 = undefined;							// these are NOT the same thing
								expect(misc.is_different(nothing3, nothing4)).to.equal(true);
								done();
							}
						},
					]
				}
			]
		},

		// is_equal_arr
		{
			suiteDescribe: 'is_equal_arr',
			mainDescribe: 'Run is_equal_arr',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should detect arrs as the same - test_id=nfnmrn',
							expectBlock: (done) => {
								let arr1;
								let arr2;
								arr1 = [1, 2, 3];
								arr2 = [1, 2, 3];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(true);

								arr1 = [1, 2, 3, 4];
								arr2 = [4, 3, 2, 1];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(true);

								arr1 = ['1', '1', '2', '3'];
								arr2 = ['3', '1', '2', '1'];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(true);

								arr1 = ['1', 1, false, null];
								arr2 = ['1', 1, null, false];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(true);
								done();
							}
						},
						{
							itStatement: 'should detect arrs as different - test_id=rhasjs',
							expectBlock: (done) => {
								let arr1;
								let arr2;
								arr1 = [1, 2, 3, 4];
								arr2 = [4, 3, 2, 1, 1];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(false);

								arr1 = ['1', '1', '2', '3'];
								arr2 = ['3', '1', '2'];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(false);

								arr1 = ['1', 1, false, null];
								arr2 = [];
								expect(misc.is_equal_arr(arr1, arr2)).to.equal(false);

								expect(misc.is_equal_arr(arr1, null)).to.equal(false);
								done();
							}
						}
					]
				}
			]
		},

		// conform_bytes
		{
			suiteDescribe: 'conform_bytes',
			mainDescribe: 'Run conform_bytes',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should conform byte units in object - test_id=iniawa',
							expectBlock: (done) => {
								const obj = {
									orderer: {
										requests: {
											cpu: '101m',
											memory: '256MiB'
										},
										limits: {
											cpu: '102m',
											memory: '256Mi'
										}
									},
									peer: {
										requests: {
											cpu: '103',
											memory: '100MB'
										},
										limits: {
											cpu: '104',
											memory: '100e6'
										}
									},
									spaces: {
										requests: {
											cpu: '105 m',
											memory: '512 MiB'
										},
										limits: {
											cpu: '106 m',
											memory: '512 Mi'
										}
									},
									nothing: {
										requests: {
											cpu: 'this is nothing',
											memory: true
										},
										limits: {
											cpu: {},
											memory: ['apple']
										}
									}
								};
								const output = {
									orderer: {
										requests: {
											cpu: '101m',
											memory: '256Mi'
										},
										limits: {
											cpu: '102m',
											memory: '256Mi'
										}
									},
									peer: {
										requests: {
											cpu: '103',
											memory: '100MB'
										},
										limits: {
											cpu: '104',
											memory: '100e6'
										}
									},
									spaces: {
										requests: {
											cpu: '105 m',
											memory: '512Mi'
										},
										limits: {
											cpu: '106 m',
											memory: '512Mi'
										}
									},
									nothing: {
										requests: {
											cpu: 'this is nothing',
											memory: true
										},
										limits: {
											cpu: {},
											memory: ['apple']
										}
									}
								};
								expect(misc.conform_bytes(obj)).to.deep.equal(output);
								done();
							}
						}
					]
				}
			]
		},

		// cert_is_near_expiration
		{
			suiteDescribe: 'cert_is_near_expiration',
			mainDescribe: 'Run cert_is_near_expiration',
			testData: [
				{
					arrayOfInfoToTest: [
						{
							itStatement: 'should see cert as valid, aka not expired test_id=cjclpf',
							expectBlock: (done) => {
								const cert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNDVENDQWErZ0F3SUJBZ0lVSDBhWERYVHlPN1pBeEoxeEVFODhDV3RscCtBd0NnWUlLb1pJemowRUF3SXcKV2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVFzd0NRWURWUVFERXdKallUQWVGdzB5Ck1EQXpNVGt4TXpFME1EQmFGdzB6TlRBek1UWXhNekUwTURCYU1Gb3hDekFKQmdOVkJBWVRBbFZUTVJjd0ZRWUQKVlFRSUV3NU9iM0owYUNCRFlYSnZiR2x1WVRFVU1CSUdBMVVFQ2hNTFNIbHdaWEpzWldSblpYSXhEekFOQmdOVgpCQXNUQmtaaFluSnBZekVMTUFrR0ExVUVBeE1DWTJFd1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DCkFBUW9OODU2aGZISjZjWGl3Y3RNMFJFc1V5ZTVwNElRbEdPSjhZN1BURzZjZWlHbEROamNOYWpla01GajlRUzcKU2lrbjN5aTNJemY3MVdSR0xmbWszcHZmbzFNd1VUQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0R3WURWUjBUQVFILwpCQVV3QXdFQi96QWRCZ05WSFE0RUZnUVVZWXYzcUtBZjdLY3BLaFppbis1NVpoa0lhT2d3RHdZRFZSMFJCQWd3CkJvY0Vmd0FBQVRBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlFQTlCVDNmb0ErMFlhbFBrNEZ3eFBlYlJyaGJWa24KaHd4aTl5cm1zQjlpb3pVQ0lEMC8rYUloQkt2S0FIaWExaTFMZE1UalU2bEZLbUY1TnYrZkNxRmYzNFVDCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K';
								// this cert has 15 year life, todo replace in 15 years.... before March 16, 2035
								expect(misc.cert_is_near_expiration(cert)).to.equal(false);
								done();
							}
						},

						{
							itStatement: 'should see cert as expred test_id=nwspat',
							expectBlock: (done) => {
								const cert = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNWekNDQWY2Z0F3SUJBZ0lVY2ZtdkwrZjJqM084M2RmYVhldGk0aVQyckh3d0NnWUlLb1pJemowRUF3SXcKWFRFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVE0d0RBWURWUVFERXdWMGJITmpZVEFlCkZ3MHlNREF6TVRreE16SXhNREJhRncweU1UQXpNVGt4TXpJMk1EQmFNQ0V4RHpBTkJnTlZCQXNUQm1Oc2FXVnUKZERFT01Bd0dBMVVFQXhNRllXUnRhVzR3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVIrREJjNwpneXozK1dQUktMWFBnSURIckovQTNReTVYb0lFR3dJTXZ4SkEyQnZ2MUxzZGpDVXAxS24rZndmWDZ1T0RaemhmCktWRisyVEozOCtjVnZ1Q2FvNEhYTUlIVU1BNEdBMVVkRHdFQi93UUVBd0lEcURBZEJnTlZIU1VFRmpBVUJnZ3IKQmdFRkJRY0RBUVlJS3dZQkJRVUhBd0l3REFZRFZSMFRBUUgvQkFJd0FEQWRCZ05WSFE0RUZnUVVJelViUklQQQprWUNia2RlTDNWN3FJa2phNU5Rd0h3WURWUjBqQkJnd0ZvQVVJY3VHblVRZWpka2pQTnVjYStEQ09GeE14T3d3ClZRWURWUjBSQkU0d1RJSkViamsyTkRBM01DMXdaV1Z5TVM1cFluQjJNaTEwWlhOMExXTnNkWE4wWlhJdWRYTXQKYzI5MWRHZ3VZMjl1ZEdGcGJtVnljeTVoY0hCa2IyMWhhVzR1WTJ4dmRXU0hCSDhBQUFFd0NnWUlLb1pJemowRQpBd0lEUndBd1JBSWdYTUViK1RYcGlPQzNaeGFqc0xPMlZmaHdScmUrK1FxcUdoRys1S20vY1BVQ0lDV1gvV1M4CnNna21jYVdkZTdRUXVyOWp6ZDdVejRReHI3WG5OU2JSelc3bgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCgo=';
								expect(misc.cert_is_near_expiration(cert)).to.equal(true);
								done();
							}
						},

						{
							itStatement: 'should not be able to parse cert for expiratoin test_id=yjqqpp',
							expectBlock: (done) => {
								const cert = 'LS0tLS1CRUdJTiBDRVJUSUZJLS0tCgo=';		// junk
								expect(misc.cert_is_near_expiration(cert)).to.equal(-1);
								done();
							}
						}
					]
				}
			]
		},
	];

	// call main test function to run this test collection
	common.mainTestFunction(testCollection, path_to_current_file);
});
