import globals from "globals";
import react from "eslint-plugin-react";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import jsdoc from 'eslint-plugin-jsdoc';


export default [
	// jsdoc.configs['flat/recommended'],
	{
		files: ["**/*.js", "**/*.jsx"],
		plugins: {
			jsdoc,
			react
		},
		ignores: ['build/*', 'setupProxy.js'],
		...reactRecommended,
		settings: {
			version: "detect",
				"react": {
					"createClass": "createReactClass",
					"pragma": "React",
					"version": "18.0",
					"flowVersion": "0.53"
				},
				"propWrapperFunctions": ["forbidExtraProps"]
		},

		languageOptions: {
			...reactRecommended.languageOptions,
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.serviceworker,
				...globals.browser,
				...globals.mocha,
				...globals.node,
				...globals.commonjs
			},
			"parserOptions": {
				"parser": "@babel/eslint-parser",
				"ecmaFeatures": {
					"jsx": true,
					"experimentalObjectRestSpread": true
				},
			},
		},
		"rules": {
			"react/jsx-max-props-per-line": [1, { "maximum": 1 }],
			"react/jsx-closing-bracket-location": [1, "line-aligned"],
			"array-bracket-spacing": 0,
			"space-before-function-paren": 0,
			"arrow-spacing": 1,
			"block-spacing": [1, "always"],
			"comma-dangle": 0,
			"comma-spacing": [
				1,
				{
					"before": false,
					"after": true
				}
			],
			"eqeqeq": [1, "smart"],
			"global-require": 0,
			"indent": [
				1,
				"tab",
				{
					"SwitchCase": 1
				}
			],
			"keyword-spacing": [
				1,
				{
					"before": true,
					"after": true
				}
			],
			"max-depth": [1, 8],
			"max-len": [1, 200],
			"max-params": [1, 7],
			"new-cap": 1,
			"no-bitwise": 1,
			"no-console": "off",
			"no-multi-spaces": 1,
			"no-new": 1,
			"no-trailing-spaces": 1,
			"no-undef": 2,
			"no-unused-vars": [
				1,
				{
					"args": "none"
				}
			],
			"no-var": 1,
			"object-curly-spacing": [1, "always"],
			"prefer-const": 0,
			"quotes": [1, "single"],
			"require-atomic-updates": 0,
			"semi": [1, "always"],
			"space-before-blocks": 1,
			"space-in-parens": [1, "never"],
			"template-curly-spacing": [1, "never"],
			// "valid-jsdoc": ["error"]
		}
	},
	{
		"files": ["src/components/Svgs/**/*.js"],
		"rules": {
			"max-len": "off"
		}
	}
];
