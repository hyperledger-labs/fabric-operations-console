/*
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
import _ from 'lodash';

const NUMBER_OF_PARTS = 5;

const versionHelper = {
	/***
	 * Parse a version string or semver object into an array of numeric parts
	 * @param {string} version A version string
	 * @returns {array} Array of numbers representing version
	 */
	getParts: version => {
		let version_string = '0';
		if (_.isString(version)) {
			// version string passed in
			version_string = version;
		} else {
			if (version.version && _.isString(version.version)) {
				// semver object passed in
				version_string = version;
			}
		}
		// convert dashes and underscores to periods
		version_string = version_string.replace(/[_-]/g, '.');
		// remove leading v or V characters
		version_string = version_string.replace(/^[vV]/, '');
		// parse version string into parts
		let parts = version_string.split('.');
		// convert part strings into numbers
		for (let i = 0; i < parts.length; i++) {
			parts[i] = Number(parts[i]);
			if (isNaN(parts[i])) {
				// non-numeric values are treated as zero
				parts[i] = 0;
			}
		}
		// ensure parts array has the minimum number of parts
		while (parts.length < NUMBER_OF_PARTS) {
			parts[parts.length] = 0;
		}
		return parts;
	},

	/**
	 * Compare version_a with version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {int} Returns -1, 0, or 1
	 */
	compare: (version_a, version_b) => {
		const parts_a = versionHelper.getParts(version_a);
		const parts_b = versionHelper.getParts(version_b);
		for (let i = 0; i < NUMBER_OF_PARTS; i++) {
			if (parts_a[i] < parts_b[i]) {
				return -1;
			}
			if (parts_a[i] > parts_b[i]) {
				return 1;
			}
		}
		return 0;
	},

	/**
	 * Test if version_a is less than version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {bool} Boolean result
	 */
	lt: (version_a, version_b) => {
		const comp = versionHelper.compare(version_a, version_b);
		return comp < 0 ? true : false;
	},

	/**
	 * Test if version_a is less than or equal to version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {bool} Boolean result
	 */
	lte: (version_a, version_b) => {
		const comp = versionHelper.compare(version_a, version_b);
		return comp <= 0 ? true : false;
	},

	/**
	 * Test if version_a is greater than version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {bool} Boolean result
	 */
	gt: (version_a, version_b) => {
		const comp = versionHelper.compare(version_a, version_b);
		return comp > 0 ? true : false;
	},

	/**
	 * Test if version_a is greater than or equal to version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {bool} Boolean result
	 */
	gte: (version_a, version_b) => {
		const comp = versionHelper.compare(version_a, version_b);
		return comp >= 0 ? true : false;
	},

	/**
	 * Test if version_a is equal to version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {bool} Boolean result
	 */
	eq: (version_a, version_b) => {
		const comp = versionHelper.compare(version_a, version_b);
		return comp === 0 ? true : false;
	},

	/**
	 * Test if version_a is not equal to version_b
	 * @param {string} version_a A version string
	 * @param {string} version_b A version string
	 * @returns {bool} Boolean result
	 */
	neq: (version_a, version_b) => {
		const comp = versionHelper.compare(version_a, version_b);
		return comp !== 0 ? true : false;
	},
};

export default versionHelper;
