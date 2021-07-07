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
//------------------------------------------------------------
// _concat.js - This is a manual script to concat js dependency files together in this folder (dependencies of Stitch.js)
//------------------------------------------------------------
const fs = require('fs-extra');
const path = require('path');
const SELF_FNAME = '_concat.js'

// start
console.log('-----------------------------------');
build_crypto_js(() => {
	console.log('-----------------------------------');
	build_stitch_dependencies_file(() => {
		console.log('\nfinal fin.');								// final out done, and its in "/dist"
	})
});

// concat stitch dependencies together
function build_stitch_dependencies_file(cb) {
	const OUTPUT_DIR = path.join(__dirname, '../dist');
	const OUTPUT = path.join(OUTPUT_DIR, 'stitch-dependencies.min.js');
	let data = '';

	// build all files where order doesn't matter
	fs.readdirSync(__dirname).forEach(function (entry) {
		const path2file = path.join(__dirname, entry);

		if (fs.lstatSync(path2file).isDirectory()) {
			console.log('skipping b/c its a folder', path2file);
		} else if (entry === SELF_FNAME) {
			console.log('skipping file b/c its myself', path2file);
		} else if (entry === OUTPUT) {
			console.log('skipping file b/c its the destination', path2file);
		} else {
			console.log('using file:', path2file);
			data += build_header(entry);
			data += fs.readFileSync(path2file);
		}
	});

	console.log('wrote file:', OUTPUT);
	fs.ensureDirSync(OUTPUT_DIR)
	fs.writeFileSync(OUTPUT, data);
	console.log('stitch dependencies fin.', data.length);
	return cb();

	function build_header(fileName) {
		return '\n// [' + fileName + ']\n';
	}
}

// concat CryptoJS dependencies together
function build_crypto_js(cb) {
	const VERSION = '4.0.0';
	const OUTPUT = path.join(__dirname, 'cryptojs-modified-' + VERSION + '.min.js');
	let data = '';

	const order2build = [									// order matters
		'core-min.js',
		'cipher-core-min.js',
		'x64-core-min.js',
		'aes-min.js',
		//4 'enc-base64_min.js',
		//3 'hmac_min.js',
		//3 'md5_min.js',
		//1 'pbkdf2_min.js',
		//1 'ripemd160_min.js',
		//2 'sha1_min.js',
		'sha256-min.js',
		//2 'sha224_min.js',
		'sha512-min.js',
		'sha384-min.js',
		//1 'tripledes_min.js',
	];
	for (let i in order2build) {
		const entry = order2build[i];
		const path2file = path.join(__dirname + '/cryptojs/', entry);

		console.log('using file:', path2file);
		data += '\n';
		data += '// [CryptoJs.' + entry + ']\n';
		data += fs.readFileSync(path2file);
	}

	console.log('wrote file:', OUTPUT);
	fs.writeFileSync(OUTPUT, data);
	console.log('cryptojs fin.', data.length);
	return cb();
}
/*
// concat stitch dependencies together
function build_jsrsasign_file(cb) {
	const VERSION = '8.0.13';
	const OUTPUT = path.join(__dirname, 'jsrsasign-partial-' + VERSION + '.min.js');
	let data = '';

	const order2build = [				// order matters
		'yahoo.min.js',
		'asn1-1.0.min.js',
		'asn1csr-1.0.min.js',
		'asn1x509-1.0.min.js',
		'crypto-1.1.min.js',		// needed by verifySignature from X509, else can remove
		'keyutil-1.0.min.js',
		'prng4-min.js',
		'rng-min.js',
		'x509-1.1.min.js',
		'jsbn2-min.js',
		'rsa-min.js',
		'base64x-1.1.min.js',
		'base64-min.js',
		'asn1hex-1.1.min.js', 			// needed by x509 parse certificate
		'ec.min.js',
		'ec-patch-min.js',
		'jsbn-min.js',					// needs ec.min.js
		'ecdsa-modified-1.0.min.js',	// needs jsbn-min.js
		'ecparam-1.0min.js',			// needs ecdsa-modified-1.0.min.js, needed by KJUR.crypto.ECDSA.
	];
	for (let i in order2build) {
		const entry = order2build[i];
		const path2file = path.join(__dirname + '/jsrsasign/', entry);

		console.log('using file:', path2file);
		data += '\n';
		data += '// [jsrsasign.' + entry + ']\n';
		data += fs.readFileSync(path2file);
	}

	console.log('wrote file:', OUTPUT);
	fs.writeFileSync(OUTPUT, data);
	console.log('jsrsasign fin.', data.length);
	return cb();
}
*/
