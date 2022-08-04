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
// esbuild.js - Our React App JS Bundler (uses esbuild)
//------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const process = require('process');

const svgrPlugin = require('esbuild-plugin-svgr');
const sassPlugin = require('esbuild-sass-plugin');
const node_stdlib_browser_plugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const stdLibBrowser = require('node-stdlib-browser');

// set file names
const fileNameBase = 'apollo.' + Date.now();
const buildPath = './build';
const buildStaticPath = './build/static';
const inputPath = './public';
const indexOutputFilePath = path.join(buildPath, 'index.html');
const outFilePath = path.join(buildStaticPath, fileNameBase + '.js');


// ---------------------------------
// Copy favicon.ico/index.html files
// ---------------------------------
rmdir(buildPath);
copy_dir_sync(inputPath, buildPath);

// ---------------------------------
// Create index.html file
// ---------------------------------
console.log('[builder] Cache busting base file name is', fileNameBase);
let indexHtml = fs.readFileSync(indexOutputFilePath, 'utf8');
indexHtml = indexHtml.replace(/apollo\.\d+/g, fileNameBase);
fs.writeFileSync(indexOutputFilePath, indexHtml);
console.log('[builder] Cache busting is done');

// ---------------------------------
// Edit localization file - dirty... dsh todo rethink this!!
// ---------------------------------
/*
// INJECT TRANSLATIONS IF FILES PRESENT
const Data = {};
*/
if (fs.existsSync('./src/assets/i18n/de/messages.json')) {
	let localizationJs = fs.readFileSync('./src/utils/localization.js', 'utf8');
	localizationJs = localizationJs.replace(/const Data = {};/, `
const Data = {
	'en': require('../assets/i18n/en/messages.json'),
	'de': require('../assets/i18n/de/messages.json'),
	'es': require('../assets/i18n/es/messages.json'),
	'fr': require('../assets/i18n/fr/messages.json'),
	'it': require('../assets/i18n/it/messages.json'),
	'ja': require('../assets/i18n/ja/messages.json'),
	'ko': require('../assets/i18n/ko/messages.json'),
	'pt-br': require('../assets/i18n/pt-br/messages.json'),
	'zh-cn': require('../assets/i18n/zh-cn/messages.json'),
	'zh-tw': require('../assets/i18n/zh-tw/messages.json'),
};
Data['pt'] = Data['pt-br'];Data['zh'] = Data['zh-cn'];Data['en-us'] = Data['en'];`);
	fs.writeFileSync('./src/utils/localization.js', localizationJs);
	console.log('[builder] Localization files added');
}

// ---------------------------------
// The build
// ---------------------------------
require('esbuild').build({
	entryPoints: ['./src/index.js'],
	loader: {
		'.js': 'jsx'
	},
	define: {
		global: 'global',
		process: 'process',
		Buffer: 'Buffer'
	},
	plugins: [
		sassPlugin.sassPlugin({ quietDeps: true }),
		svgrPlugin(),
		node_stdlib_browser_plugin(stdLibBrowser),
	],
	external: [],			// don't use external, it is not intended for a bundled app in a browser
	inject: [
		require.resolve('node-stdlib-browser/helpers/esbuild/shim'),
		//'./buffer-shim.js',
		//'./process-shim.js',
	],
	platform: 'browser',
	bundle: true,
	minify: true,
	sourcemap: true,
	//target: ['chrome58', 'firefox57', 'safari11'],
	outfile: outFilePath,
}).catch(() => {
	console.error('[builder] Build Failed');
	process.exit(1);
});
console.log('[builder] Building app to location', outFilePath);

// ---------------------------------
// check if the path to a file exists, create it if needed
// ---------------------------------
/*
opts: {
	file_path: '/something/here/to/do.jpg',
	create: true
}
*/
function check_dir_sync(opts) {
	let folders = opts.file_path.replace(/\\/g, '//').split('/');	// replace window's path delimiters
	folders.splice(folders.length - 1, 1);							// remove the file at the end of path
	let path = '';
	for (let i in folders) {										// walk the path and make each folder to it
		path += folders[i] + '/';
		if (!fs.existsSync(path)) {
			if (opts.create === true) {
				fs.mkdirSync(path);
			} else {
				return false;
			}
		}
	}
	return true;
};

// ---------------------------------
// copy an entire directory
// ---------------------------------
function copy_dir_sync(old_dir_path, new_dir_path) {
	check_dir_sync({ file_path: new_dir_path, create: true });
	if (fs.existsSync(old_dir_path)) {
		if (fs.lstatSync(old_dir_path).isDirectory()) {

			if (!fs.existsSync(new_dir_path)) {								// make new dir
				fs.mkdirSync(new_dir_path);
			}

			fs.readdirSync(old_dir_path).forEach(function (entry) {
				const old_entry_path = path.join(old_dir_path, entry);
				const new_entry_path = path.join(new_dir_path, entry);
				if (fs.lstatSync(old_entry_path).isDirectory()) {
					copy_dir_sync(old_entry_path, new_entry_path);
				} else {													// copy new file
					const data = fs.readFileSync(old_entry_path);
					fs.writeFileSync(new_entry_path, data);
					console.log(' - copied file', entry);
				}
			});
		}
	}
};

// ---------------------------------
// remove an entire directory
// ---------------------------------
function rmdir(dir_path) {
	console.log('[builder] Cleaning dir', dir_path);
	if (fs.existsSync(dir_path)) {
		fs.readdirSync(dir_path).forEach(function (entry) {
			const entry_path = path.join(dir_path, entry);
			if (fs.lstatSync(entry_path).isDirectory()) {
				rmdir(entry_path);
			}
			else {
				fs.unlinkSync(entry_path);
			}
		});
		fs.rmdirSync(dir_path);
	}
};
