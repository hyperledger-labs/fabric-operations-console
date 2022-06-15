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
// performance.js - Host performance debug functions
//------------------------------------------------------------

module.exports = function (logger, ev, t) {
	const perf = {};
	const disk_test_file = t.path.join(__dirname, '../logs/disk_test.txt');

	//------------------------------------------------------------
	// Static string over network test
	//------------------------------------------------------------
	perf.static_test = (req, res) => {
		const ret = {
			test: 'Static string',
			start: req._start,
			text: `Lorem ipsum dolor sit amet, autem propriae ut ius.
			Qui at dolor tacimates scripserit, debet dicit mei id, mnesarchum moderatius vel et.
			Per prompta sensibus no. Etiam feugiat blandit sea ut, no usu veniam dolorem neglegentur.
			Omnes recusabo eos ad, mea vidit adipiscing ne.

			Mea elitr vidisse dissentias eu.
			Civibus philosophia cu usu, odio cetero mandamus est in, salutandi reprehendunt id est.
			Eum paulo oratio aliquip cu, fabulas similique his te.Ad cum quem legimus iudicabit, vim unum vero convenire cu, sint noster urbanitas nec te.
			Ubique quaeque at vel, inermis vivendum et quo.
			In has agam minim soleat.
			Wisi doming oblique ei pro, te nam mollis latine impetus.`
		};

		ret.end = Date.now();
		ret.backend_elapsed_ms = ret.end - ret.start;
		res.status(200).json(ret);
	};

	//------------------------------------------------------------
	// Random string over network test - stresses network and cpu equally
	//------------------------------------------------------------
	perf.random_test = (req, res) => {
		const len = Number(req.params.len) || 1000 * 256;
		const ret = {
			test: 'Random string',
			start: req._start,
			char_len: len,
			text: t.misc.generateRandomString(len),
		};

		ret.end = Date.now();
		ret.backend_elapsed_ms = ret.end - ret.start;
		res.status(200).json(ret);
	};

	//------------------------------------------------------------
	// Random sorted string over network test - stresses cpu more than network
	//------------------------------------------------------------
	perf.random_sorted_test = (req, res) => {
		const len = Number(req.params.len) || 1000 * 256;
		const random = t.misc.generateRandomString(len);
		const ret = {
			test: 'Sorted random string',
			start: req._start,
			char_len: len,
			text: random.split(/(\w)/g).sort().join('').trim(),
		};

		ret.end = Date.now();
		ret.backend_elapsed_ms = ret.end - ret.start;
		res.status(200).json(ret);
	};

	//------------------------------------------------------------
	// Write to disk test - stresses disk
	//------------------------------------------------------------
	perf.disk_write = (req, res) => {
		const len = Number(req.params.len) || 1000 * 256;
		const ret = {
			test: 'Write disk',
			start: req._start,
			char_len: len,
		};
		try {
			t.fs.writeFileSync(disk_test_file, t.misc.generateRandomString(len));
		} catch (e) {
			logger.error('[perf] unable to write file', e);
		}

		ret.end = Date.now();
		ret.backend_elapsed_ms = ret.end - ret.start;
		res.status(200).json(ret);
	};

	//------------------------------------------------------------
	// Read from disk test - stresses disk
	//------------------------------------------------------------
	perf.disk_read = (req, res) => {
		const ret = {
			test: 'Read disk',
			start: req._start,
			char_len: 0,
		};
		try {
			const orig_file = t.fs.existsSync(disk_test_file) ? t.fs.readFileSync(disk_test_file) : '';
			ret.char_len = orig_file.length;
		} catch (e) {
			logger.error('[perf] unable to read file', e);
		}
		ret.end = Date.now();
		ret.backend_elapsed_ms = ret.end - ret.start;
		res.status(200).json(ret);
	};

	//------------------------------------------------------------
	// Delete disk test file - aka clean up disk tests
	//------------------------------------------------------------
	perf.disk_clean = (req, res) => {
		const ret = {
			test: 'Delete disk test file',
			start: req._start,
		};
		try {
			t.fs.existsSync(disk_test_file) ? t.fs.unlinkSync(disk_test_file) : '';
		} catch (e) {
			logger.error('[perf] unable to delete file', e);
		}
		ret.end = Date.now();
		ret.backend_elapsed_ms = ret.end - ret.start;
		res.status(200).json(ret);
	};

	return perf;
};
