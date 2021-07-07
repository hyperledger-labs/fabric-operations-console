
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
