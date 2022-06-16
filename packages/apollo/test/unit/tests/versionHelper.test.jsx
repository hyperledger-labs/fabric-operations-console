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
import versionHelper from '../../../src/utils/version.js';

describe('versionHelper utility', () => {
	test('should parse a 3 part version string', () => {
		const parts = versionHelper.getParts('1.2.3');
		expect(parts).toStrictEqual([1, 2, 3, 0, 0]);
	});

	test('should parse a 3 part version string that uses underscores', () => {
		const parts = versionHelper.getParts('1_2_3');
		expect(parts).toStrictEqual([1, 2, 3, 0, 0]);
	});

	test('should parse a 4 part version string that uses a dash', () => {
		const parts = versionHelper.getParts('1.2.3-4');
		expect(parts).toStrictEqual([1, 2, 3, 4, 0]);
	});

	test('should parse a 3 part version string that has a v in front', () => {
		const parts = versionHelper.getParts('v1.2.3');
		expect(parts).toStrictEqual([1, 2, 3, 0, 0]);
	});

	test('should parse a version string with text', () => {
		const parts = versionHelper.getParts('1.alpha.3');
		expect(parts).toStrictEqual([1, 0, 3, 0, 0]);
	});

	test('1.0 less than 2.0', () => {
		const result = versionHelper.lt('1.0', '2.0');
		expect(result).toBe(true);
	});

	test('1.0 greater than 2.0', () => {
		const result = versionHelper.gt('1.0', '2.0');
		expect(result).toBe(false);
	});

	test('1.0 equals 1.0.0', () => {
		const result = versionHelper.eq('1.0', '1.0.0');
		expect(result).toBe(true);
	});

	test('1.0.1 equals 1.0.0', () => {
		const result = versionHelper.eq('1.0.1', '1.0.0');
		expect(result).toBe(false);
	});

	test('1.9.0 greater than 2.0.1', () => {
		const result = versionHelper.gt('1.9.0', '2.0.1');
		expect(result).toBe(false);
	});

	test('2.1.1-1 less than 2.1.1-2', () => {
		const result = versionHelper.lt('2.1.1-1', '2.1.1-2');
		expect(result).toBe(true);
	});
});
