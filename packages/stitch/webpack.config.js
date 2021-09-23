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

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const FOLDER = path.resolve(__dirname, 'dist');
console.log('Output directory of TS building:', FOLDER);

module.exports = [
	{
		name: 'development',
		mode: 'development',
		entry: ['./src/stitch.ts'],
		output: {
			path: FOLDER,
			filename: 'stitch-main.js',
			libraryTarget: 'var',
			library: 'stitch'
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					include: /src/,
					exclude: /node_modules/,
					loader: 'ts-loader'
				}
			]
		},
		resolve: {
			extensions: ['.ts', '.js']
		},
		plugins: [
			new webpack.BannerPlugin({ banner: fs.readFileSync('./LICENSE_HEADER', 'utf8').replace('IBM Confidential', '') }),
		],
		devtool: 'inline-source-map',
	},
	{
		name: 'production',
		mode: 'production',
		entry: ['./src/stitch.ts'],
		output: {
			path: FOLDER,
			filename: 'stitch-main-min.js',
			libraryTarget: 'var',
			library: 'stitch'
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					include: /src/,
					exclude: /node_modules/,
					loader: 'ts-loader'
				}
			]
		},
		resolve: {
			extensions: ['.ts', '.js']
		},
		plugins: [
			new webpack.BannerPlugin({ banner: fs.readFileSync('./LICENSE_HEADER', 'utf8') }),
		]
	},
];
