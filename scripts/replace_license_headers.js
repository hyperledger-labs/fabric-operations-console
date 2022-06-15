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
// replace_license_headers.js - scan the hlf console code and replace the APACHE LICENSE with the given license
//------------------------------------------------------------
// Use:
//
// node replace_license_headers.js <path-to-directory-to-scan> <license-to-use> --force?
//
// --force -> 	[optional] if present will add the license to top of all files even if old license not found.
//				only works over these file extensions: .js, .go, .ts
//
// node replace_license_headers.js ../ license_header.txt --force

const path = require('path');
const fs = require('fs');

// start
console.log('\n[License Header Replacement Script]');
let changes = 0;
const opts = check_cli_arguments();
opts.license = fs.readFileSync(opts.license_path, 'utf-8');
replace_license_headers_in_files(opts, () => {
	console.log('Files changed:', changes);
	console.log('Fin.\n\n');
});


// check cli input - return path to directory from this path
function check_cli_arguments() {
	if (process.argv.length < 3) {														// not enough arguments
		console.error('Not enough arguments');
		console.error('Try something like: node replace_license_headers.js DIRECTORY_PATH LICENSE_PATH');
		console.error('Better luck next time');
		process.exit();
	} else {
		const args = process.argv.splice(2);
		const ret = {
			dir_path: path.join(__dirname, args[0]),
			license_path: path.join(__dirname, args[1]),
			force: (args[2] === '--force') ? true : false,
		};
		console.log('Using args:', JSON.stringify(ret, null, 2));
		return ret;
	}
}

// --------------------------------------------------------------
// replace license headers in all files
// --------------------------------------------------------------
/*
	{
		dir_path: '',
		license_path: '',
		license: ''
	}
*/
function replace_license_headers_in_files(opts, cb) {
	fs.readdirSync(opts.dir_path).forEach(function (entry) {
		const path2file = path.join(opts.dir_path, entry);

		if (skip_these(entry)) {
			//console.log('skipping file:', path2file);
			return;
		}

		if (fs.lstatSync(path2file).isDirectory()) {
			const opts_deeper = {
				...opts
			};
			opts_deeper.dir_path = path2file;
			replace_license_headers_in_files(opts_deeper, () => {

			});
		} else {
			let new_file = null;
			let write_file = false;
			let orig_file = null;
			try {
				orig_file = fs.readFileSync(path2file, 'utf-8');
				new_file = replace_license_header(orig_file, opts.license);
			} catch (e) {
				console.error('[!] unable to read file:', path2file, e);
			}

			if (!new_file) {
				console.error('[!] license header not found in file:', path2file);

				// if force is set && we didn't find the license header, add license to top of file anyway
				if (opts.force === true) {
					// make sure file type is okay wit /**/ style comments
					if (/\.js$/.test(entry) || /\.go$/.test(entry) || /\.ts$/.test(entry)) {
						write_file = true;
						new_file = opts.license.trim() + '\n' + orig_file;
						console.log('[!] force writing file:', path2file);
					}
				}
			} else {
				if (orig_file.trim().length !== new_file.trim().length) {
					write_file = true;
				}
			}

			if (write_file) {
				changes++;
				fs.writeFileSync(path2file, new_file);
				//console.log('wrote file:', path2file);
			}
		}
	});

	return cb();

	// don't check these files for a license header
	function skip_these(file) {
		const skip_files = [
			// files
			'^.gitignore$',
			'^.dockerignore$',
			'^.eslintignore$',
			'^.cfignore$',
			'^.gitmodules$',
			'^robots.txt$',
			'^version.txt$',
			'^.secrets.baseline$',
			'^Dockerfile$',
			'^dictionary_blockchain.txt$',
			'^LICENSE_HEADER$',
			'^CODEOWNERS$',
			'^LICENSE$',
			'^Gemfile$',
			'^Gemfile.lock$',
			'^Makefile$',
			'^.prettierrc$',
			'^console_url.txt$',
			'^license_header.txt$',
			'^replace_license.js$',

			// file types
			'.conf$',
			'.tar$',
			'.json$',
			'.yaml$',
			'.yml$',
			'.sh$',
			'.md$',
			'.svg$',
			'.scss$',
			'.css$',
			'.proto$',
			'.ubi8$',
			'.feature$',
			'.tgz$',
			'.cds$',
			'.ico$',
			'.html$',

			// folders
			'^.git$',
			'^.github$',
			'^images$',
			'^protoc$',
			'^ext_libs$',
			'^node_modules$',
			'^coverage$',
			'^dist$',
			'^logs$',
			'^build$',
			'^env$',
		];
		for (let i in skip_files) {
			if (new RegExp(skip_files[i]).test(file)) {
				return true;
			}
		}
		return false;
	}
}

// --------------------------------------------------------------
// find and replace license header in text
// --------------------------------------------------------------
function replace_license_header(text, new_license) {
	if (typeof text === 'string') {
		// this regex matches on:
		// starts with: "/*/n*Licensed under the Apache License, Version"
		// ends with: "License\n*/"
		const regex_license = new RegExp(/\/\*\s*\*\s*Licensed under the Apache License, Version.*License.\s*\*\//sg);
		if (!regex_license.test(text)) {
			return null;
		} else {
			const ret = text.replace(regex_license, new_license.trim());
			return ret;
		}
	}
}
