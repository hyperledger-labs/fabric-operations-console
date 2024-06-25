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

import naturalSort from 'javascript-natural-sort';
import _ from 'lodash';
import React from 'react';
import isEmail from 'validator/lib/isEmail';
import HiddenText from '../components/HiddenText/HiddenText';
import StitchApi from '../rest/StitchApi';
import { VALIDATION_ERRORS } from '../rest/ValidatedRestApi';
import { EventsRestApi } from '../rest/EventsRestApi';
const semver = require('semver');
const JSZip = require('jszip');
const zlib = require('zlib');
const tarStream = require('tar-stream');

const Buffer = window.Buffer || require('buffer').Buffer;

const urlParser = require('url');

const INVALID_CHARS = null; // Ex: /[abc]/
const SPECIAL_CHARS = '!@#$%^&*()-_=+[{}]:;"\',<.>?';

const JSON_LIMIT = 1024000; // 1 MB limit for JSON files

const CHAINCODE_LIMIT = 25 * 1024 * 1024; // 25MB limit for chaincode files

const Helper = {
	mapStateToProps: (state, propTypes) => {
		const newState = {};
		const keys = Object.keys(propTypes);
		keys.forEach(key => {
			if (state && state[key] !== undefined) {
				newState[key] = state[key];
			}
		});
		return newState;
	},

	// dsh todo remove "platform"
	infrastructure: {
		platform: 'ibmcloud',
		supported_cas: ['ibmcloud', 'icp', 'openshift', 'kubernetes'],
		supported_orderers: ['ibmcloud', 'icp', 'openshift', 'kubernetes'],
		supported_peers: ['ibmcloud', 'icp', 'openshift', 'kubernetes'],
	},

	getPlatform() {
		return this.infrastructure.platform;
	},

	setPlatform(platform) {
		this.infrastructure.platform = platform;
	},

	getSupportedCAs() {
		return this.infrastructure.supported_cas;
	},

	getSupportedOrderers() {
		return this.infrastructure.supported_orderers;
	},

	getSupportedPeers() {
		return this.infrastructure.supported_peers;
	},

	setInfrastructure(infrastructure) {
		this.infrastructure = {
			...this.infrastructure,
			...infrastructure,
		};
	},

	//------------------------------------------------------------
	// Sort an object's key fields, RECURSIVE! (Order: Symbols, Numbers, Upper Case, Lower Case)
	//------------------------------------------------------------
	sortKeys(unsorted, iter, max) {
		let ordered = {};
		iter = iter || 0;
		max = max || 1000;
		if (iter > max) {														// our watch dog
			return unsorted;
		}

		if (isObject(unsorted)) {
			Object.keys(unsorted).sort(compareStrings).forEach(function (key) {
				ordered[key] = unsorted[key];									// sort all the object's keys
			});
		} else {
			return unsorted;
		}

		for (let i in ordered) {
			if (isObject(ordered[i])) {
				ordered[i] = Helper.sortKeys(ordered[i], ++iter, max);				// sort all the object's object's keys
			} else if (Array.isArray(ordered[i])) {
				for (let z in ordered[i]) {
					if (ordered[i][z] && isObject(ordered[i][z])) {
						ordered[i][z] = Helper.sortKeys(ordered[i][z], ++iter, max); // sort the inner object
					}
				}
			}
		}
		return ordered;

		function compareStrings(a, b) {
			return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
		}

		function isObject(o) {
			return o instanceof Object && o.constructor === Object;
		};
	},

	getExportedNode(node, zipExport) {
		if (node.raft) {
			const data = [];
			const associatedIdentities = node.associatedIdentities ? [...node.associatedIdentities] : [];
			node.raft.forEach(raft_node => {
				let exportNode = Helper.getExportedNode(raft_node, zipExport);
				if (_.isArray(exportNode)) {
					exportNode.forEach(sub_node => {
						if (zipExport) {
							associatedIdentities.forEach(ai => {
								if (ai.msp_id === sub_node.msp_id) {
									sub_node.associatedIdentityName = ai.name;
								}
							});
						}
						data.push(sub_node);
					});
				} else {
					if (zipExport) {
						associatedIdentities.forEach(ai => {
							if (ai.msp_id === exportNode.msp_id) {
								exportNode.associatedIdentityName = ai.name;
							}
						});
					}
					data.push(exportNode);
				}
			});
			return data;
		}
		let exportNode = {};
		if (node.type === 'identity') {
			exportNode = {
				name: node.name,
				type: 'identity',
				private_key: node.private_key,
				cert: node.cert,
			};
		} else if (node.type === 'msp' || node.type === 'msp_info' || node.type === 'msp-external') {
			exportNode = {
				display_name: node.display_name,
				msp_id: node.msp_id,
				type: 'msp',
				admins: node.admins,
				root_certs: node.root_certs,
				intermediate_certs: node.intermediate_certs,
				tls_root_certs: node.tls_root_certs,
				tls_intermediate_certs: node.tls_intermediate_certs,
				revocation_list: node.revocation_list,
				organizational_unit_identifiers: node.organizational_unit_identifiers,
				fabric_node_ous: node.fabric_node_ous,
				host_url: node.host_url,
				id: node.id,
				scheme_version: node.scheme_version,
				migrated_from: node.migrated_from ? node.migrated_from : undefined,
				imported: node.imported ? node.imported : undefined,
				cluster_type: node.cluster_type ? node.cluster_type : undefined,
				console_type: node.console_type ? node.console_type : undefined,

				// legacy fields needed for import on older systems
				name: node.display_name,
			};
			if (zipExport) {
				exportNode.id = node.id;
			}
			if (node.type === 'msp_info') {
				delete exportNode.type;
				delete exportNode.display_name;
				delete exportNode.msp_id;
			}
		} else {
			if (node.type === 'fabric-orderer' && _.get(node, 'msp.component.tls_cert')) {
				delete node.client_tls_cert;
				delete node.server_tls_cert;
			}

			// this is the format of an exported node
			exportNode = {
				display_name: node.display_name,
				grpcwp_url: node.grpcwp_url,
				api_url: node.api_url,
				operations_url: node.operations_url,
				osnadmin_url: node.osnadmin_url,
				type: node.type,
				msp_id: node.msp_id,
				systemless: node.systemless,
				system_channel_id: node.systemless ? '' : node.system_channel_id,
				msp: node.msp,
				cluster_id: Helper.normalizeClusterId(node.cluster_id),
				cluster_name: node.cluster_name,
				client_tls_cert: node.client_tls_cert,
				server_tls_cert: node.server_tls_cert,
				location: node.location === 'ibm_saas' ? this.getPlatform() : node.location,
				id: node.id,
				scheme_version: node.scheme_version,
				migrated_from: node.migrated_from ? node.migrated_from : undefined,
				imported: node.imported ? node.imported : undefined,
				cluster_type: node.cluster_type ? node.cluster_type : undefined,
				console_type: node.console_type ? node.console_type : undefined,

				// legacy fields needed for import on older systems
				name: node.display_name,
				pem: node.tls_ca_root_cert || _.get(node, 'msp.component.tls_cert'),
				ca_url: node.ca_url,
				ca_name: _.get(node, 'msp.ca.name'),
				tlsca_name: _.get(node, 'msp.tlsca.name'),
				tls_cert: _.get(node, 'msp.component.tls_cert'),
				tls_ca_root_cert: _.get(node, 'msp.tlsca.root_certs[0]'),
			};

			if (node.node_ou) {
				exportNode.node_ou = node.node_ou;
			}

			if (zipExport) {
				exportNode.id = node.id;
				exportNode.associatedIdentityName = node.associatedIdentityName;
			}
		}
		return Helper.sortKeys(exportNode);
	},

	normalizeClusterId(id) {
		if (id) {
			const i = id.indexOf('_');
			if (i === -1) {
				return id;
			} else {
				return id.substring(0, i);
			}
		}
		return undefined;
	},

	/*
	 * Export a node as JSON
	 */
	exportNode(node) {
		let exportedNode = Helper.getExportedNode(node);
		const type = node.type ? '_' + node.type.replace(/fabric-/, '') : '';
		const nodeName = (node.display_name || node.cluster_name || node.name);
		let fileName = nodeName + type + '.json';

		exportedNode = JSON.stringify(exportedNode, null, 4);
		let blob = new Blob([exportedNode], { type: 'application/json;' });
		const createTarget =
			document.querySelector('.vertical__panel--outer--container') || document.querySelector('.side__panel--outer--container') || document.body;
		let link = document.createElement('a');
		if (link.download !== undefined) {
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', fileName);
			link.style.visibility = 'hidden';
			createTarget.appendChild(link);
			link.click();
			createTarget.removeChild(link);

			try {
				EventsRestApi.recordActivity({ status: 'success', log: 'exporting component "' + (node.id || nodeName) + '"' });
			} catch (e) {
				console.error('unable to record export', e);
			}
		}
	},

	openJSONBlob(json) {
		json = JSON.stringify(json, null, 4);
		let blob = new Blob([json], { type: 'application/json;' });
		const createTarget =
			document.querySelector('.vertical__panel--outer--container') || document.querySelector('.side__panel--outer--container') || document.body;
		let link = document.createElement('a');
		if (link.download !== undefined) {
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('target', '_new');
			link.style.visibility = 'hidden';
			createTarget.appendChild(link);
			link.click();
			createTarget.removeChild(link);
		}
	},

	/*
	 * Export a nodes as Zip
	 */
	exportNodesAsZip(nodes) {
		let exportedNodes = Helper.getExportedNode(nodes, true);
		let zip = new JSZip();

		return new Promise((resolve, reject) => {
			exportedNodes.forEach(myNode => {
				const type = myNode.type ? myNode.type.replace(/fabric-/, '') : '';
				let fileName = (myNode.id || myNode.name) + '_' + type + '.json';
				let folderName = type;
				switch (type) {
					case 'peer':
						folderName = 'Peers';
						break;
					case 'orderer':
						folderName = 'Ordering Services';
						break;
					case 'ca':
						folderName = 'Certificate Authorities';
						break;
					case 'msp':
						folderName = 'Organizations';
						break;
					case 'identity':
						folderName = 'Wallet';
						break;
					default:
						break;
				}
				let exportNode = { ...myNode };
				if (exportNode.id) {
					delete exportNode.id;
				}
				zip.file(folderName + '/' + fileName, JSON.stringify(exportNode, null, 4));
			});

			zip.generateAsync({ type: 'blob' }).then(
				blob => {
					const createTarget =
						document.querySelector('.side__panel--outer--container') || document.querySelector('.vertical__panel--outer--container') || document.body;
					let link = document.createElement('a');
					if (link.download !== undefined) {
						const d = new Date();
						const dateStr = d.toLocaleDateString().replace(/[/_]/g, '-') + '-' + d.toLocaleTimeString().replace(/[:\sAPM]/g, '');
						let zipName = 'FOC.' + dateStr + '.zip';
						let url = URL.createObjectURL(blob);
						link.setAttribute('href', url);
						link.setAttribute('download', zipName);
						link.style.visibility = 'hidden';
						createTarget.appendChild(link);
						link.click();
						createTarget.removeChild(link);

						try {
							EventsRestApi.recordActivity({ status: 'success', log: 'bulk export of ' + exportedNodes.length + ' component' + (exportedNodes.length > 1 ? 's' : '') });
						} catch (e) {
							console.error('unable to record export', e);
						}
					}
					resolve();
				},
				err => {
					reject(err);
					console.error('Error exporting', err);
				}
			);
		});
	},

	/*
	 * Export data as a text .pem file
	 */
	exportPem(name, data) {
		let fileName = name + '.pem';
		data = atob(data);
		let blob = new Blob([data], { type: 'text/plain;' });
		const createTarget = document.querySelector('.side__panel--outer--container') || document.body;
		let link = document.createElement('a');
		if (link.download !== undefined) {
			let url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', fileName);
			link.style.visibility = 'hidden';
			createTarget.appendChild(link);
			link.click();
			createTarget.removeChild(link);

			try {
				EventsRestApi.recordActivity({ status: 'success', log: 'exporting certificate' });
			} catch (e) {
				console.error('unable to record export', e);
			}
		}
	},

	isCertificate(cert) {
		if (cert) {
			cert = cert.trim();
			if (!/^-----BEGIN CERTIFICATE-----/m.exec(cert)) {
				try {
					cert = atob(cert);
				} catch (e) {
					return false;
				}
			}

			if (!/^-----BEGIN CERTIFICATE-----/m.exec(cert)) {
				return false;
			}
			if (!/-----END CERTIFICATE-----$/m.exec(cert)) {
				return false;
			}
		}
		return true;
	},

	getCertArray(b64certs) {
		let decodedCerts = atob(b64certs);
		let certArray = decodedCerts.split('-----END CERTIFICATE-----');
		certArray = certArray
			.filter(mycert => mycert.trim() !== '')
			.map(mycert => {
				mycert = mycert + '-----END CERTIFICATE-----\n';
				mycert = mycert.trim();
				return mycert;
			});
		return certArray;
	},

	/*
		get longest expiration from the array
	*/
	getLongestExpiry(admins) {
		if (typeof admins === 'string' || admins instanceof String) {
			admins = [admins];
		}
		let longest = undefined;
		const timeNow = new Date().getTime();
		admins.forEach(cert => {
			if (cert) {
				try {
					const parsedCert = StitchApi.parseCertificate(cert);
					const diff = parsedCert.not_after_ts - timeNow;
					const days = diff / (1000 * 3600 * 24);
					if (longest === undefined || days > longest) {
						longest = days;
					}
				} catch (e) {
					// parse failed
				}
			}
		});
		return longest;
	},

	getExpiryMulti(multi) {
		let shortest = undefined;
		multi.forEach(certs => {
			if (certs) {
				const days = Helper.getLongestExpiry(certs);
				if (days !== undefined) {
					if (shortest === undefined || days < shortest) {
						shortest = days;
					}
				}
			}
		});
		return shortest;
	},

	hash_str(str) {
		let hash = 0;
		for (const i in str) {
			const char = str.charCodeAt(i);
			// eslint-disable-next-line no-bitwise
			hash = (hash << 5) - hash + char;
			// eslint-disable-next-line no-bitwise
			hash = hash & hash;
		}
		hash = Math.abs(hash);
		return hash;
	},

	cleanUpCertificateFormat(cert) {
		if (cert) {
			cert = cert.trim();
			if (!/^-----BEGIN/m.exec(cert)) {
				try {
					cert = atob(cert);
				} catch (e) {
					console.log(e);
				}
			}
			if (/^-----BEGIN/m.exec(cert)) {
				if (cert.indexOf('\\n') !== -1) {
					cert = cert.replace(/\\n/g, '\n');
				}
			}
			cert = btoa(cert);
		}
		return cert;
	},

	isPrivateKey(key) {
		if (key) {
			if (!/^-----BEGIN PRIVATE KEY-----/m.exec(key)) {
				try {
					key = atob(key);
				} catch (e) {
					return false;
				}
			}
			if (!/^-----BEGIN PRIVATE KEY-----/m.exec(key)) {
				return false;
			}
			if (!/-----END PRIVATE KEY-----$/m.exec(key)) {
				return false;
			}
		}
		return true;
	},

	convertCollectionToSnake(camel) {
		let snake = [];
		for (let collection of camel) {
			collection.required_peer_count = Object.prototype.hasOwnProperty.call(collection, 'required_peer_count')
				? collection.required_peer_count
				: collection.requiredPeerCount;
			collection.maximum_peer_count = Object.prototype.hasOwnProperty.call(collection, 'maximum_peer_count')
				? collection.maximum_peer_count
				: collection.maxPeerCount;
			collection.block_to_live = Object.prototype.hasOwnProperty.call(collection, 'block_to_live') ? collection.block_to_live : collection.blockToLive;
			collection.member_only_read = Object.prototype.hasOwnProperty.call(collection, 'member_only_read')
				? collection.member_only_read
				: collection.memberOnlyRead;
			collection.member_only_write = Object.prototype.hasOwnProperty.call(collection, 'member_only_write')
				? collection.member_only_write
				: collection.memberOnlyWrite;
			collection.member_orgs_policy = Object.prototype.hasOwnProperty.call(collection, 'member_orgs_policy')
				? collection.member_orgs_policy
				: collection.policy;
			let signature_policy = _.get(collection, 'endorsement_policy') || _.get(collection, 'endorsementPolicy.signaturePolicy');
			if (signature_policy) {
				_.set(collection, 'endorsement_policy', signature_policy);
			}
			delete collection.policy;
			delete collection.requiredPeerCount;
			delete collection.maxPeerCount;
			delete collection.blockToLive;
			delete collection.memberOnlyRead;
			delete collection.memberOnlyWrite;
			delete collection.endorsementPolicy;
			snake.push(collection);
		}
		return snake;
	},
	emailInput: null,
	urlInput: null,

	isEmail(email) {
		// let browser do e-mail validation
		if (!this.emailInput) {
			this.emailInput = document.createElement('input');
			this.emailInput.type = 'email';
		}
		this.emailInput.value = email;
		let res = this.emailInput.validity.valid;
		if (res) {
			// also use validation lib for additional checks
			res = isEmail(email);
		}
		return res;
	},

	isURL(url) {
		if (!this.urlInput) {
			this.urlInput = document.createElement('input');
			this.urlInput.type = 'url';
		}
		this.urlInput.value = url;
		return this.urlInput.validity.valid;
	},

	isNumber(value) {
		return value && !isNaN(value);
	},

	isPositiveNumber(value) {
		return value && !isNaN(value) && value > 0;
	},

	isPKCS11Proxy(value) {
		return value && (value.indexOf('tcp://') !== -1 || value.indexOf('tls://') !== -1);
	},

	// get hostname from the url
	getHostname(url) {
		try {
			const parts = urlParser.parse(url);
			return parts.hostname;
		} catch (e) {
			console.error('cannot parse hostname from url:', url, e);
			return '';
		}
	},

	// get port from url, use standard ports if there is no port on url
	getPort(url) {
		try {
			const parts = urlParser.parse(url);
			const protocol = parts.protocol ? parts.protocol : 'https:';
			if (parts.port === null) {
				parts.port = protocol === 'https:' ? '443' : '80';
			}
			return parts.port;
		} catch (e) {
			console.error('cannot parse port from url:', url, e);
			return null;
		}
	},

	// return true if these urls are equal in terms of their hostname and port
	urlsAreEqual(url1, url2) {
		return (
			this.getHostname(url1) === this.getHostname(url2) &&
			Number(this.getPort(url1)) === Number(this.getPort(url2))
		);
	},

	normalizeHttpURL(http_url) {
		// append port for grpc url if not available...
		let url_parse = urlParser.parse(http_url, true);
		if (url_parse !== null && !url_parse.port) {
			if (url_parse.protocol === 'https:') {
				http_url = url_parse.protocol + '//' + url_parse.host + ':443';
			} else {
				http_url = url_parse.protocol + '//' + url_parse.host + ':80';
			}
		}
		return http_url;
	},

	validateCharacters(data) {
		if (INVALID_CHARS && data && data.match && data.match(INVALID_CHARS)) {
			return false;
		}
		return true;
	},

	getMSPFields(skip_host) {
		let mspFields = [
			{
				name: 'msp_id',
				required: true,
				specialRules: Helper.SPECIAL_RULES_MSP_ID,
			},
			{
				name: 'display_name',
				alias: ['short_name', 'name'],
				required: true,
				specialRules: Helper.SPECIAL_RULES_DISPLAY_NAME,
			},
			{
				name: 'root_certs',
				required: true,
			},
			{
				name: 'admins',
				required: true,
			},
			{
				name: 'intermediate_certs',
				required: false,
			},
			{
				name: 'tls_intermediate_certs',
				required: false,
			},
			{
				name: 'tls_root_certs',
				required: false,
			},
			{
				name: 'revocation_list',
				required: false,
			},
			{
				name: 'organizational_unit_identifiers',
				required: false,
			},
			{
				name: 'fabric_node_ous',
				required: false,
			},
		];
		if (!skip_host) {
			mspFields.push({
				name: 'host_url',
				required: true,
			});
		}
		return mspFields;
	},

	SPECIAL_RULES_DISPLAY_NAME: {
		noSpecialFirstChar: true,
		maxLength30: true,
		noLeadingWhitespace: true,
		noTrailingWhitespace: true,
	},

	SPECIAL_RULES_IDENTITY_NAME: {
		noSpecialFirstChar: true,
		maxLength64: true,
		noLeadingWhitespace: true,
		noTrailingWhitespace: true,
	},

	SPECIAL_RULES_ENROLL_ID: {
		noSpecialFirstChar: true,
		maxLength64: true,
		nonWhitespace: true,
		noDoubleQuote: true,
		noURLEncodeChars: true,
	},

	SPECIAL_RULES_ENROLL_SECRET: {
		maxLength64: true,
		nonWhitespace: true,
		noDoubleQuote: true,
		noURLEncodeChars: true,
	},

	SPECIAL_RULES_MSP_ID: {
		noSpecialFirstChar: true,
		maxLength64: true,
		nonWhitespace: true,
	},

	SPECIAL_RULES_CHANNEL_NAME: {
		maxLength64: true,
	},

	SPECIAL_RULES_LOGIN_EMAIL: {
		nonWhitespace: true,
		maxLength64: true,
	},

	SPECIAL_RULES_POSITIVE_INT: {
		numericCharactersOnly: true,
	},

	checkSpecialRules(value, rules) {
		if (value && rules) {
			if (rules.noSpecialFirstChar) {
				if (SPECIAL_CHARS.indexOf(value.charAt(0)) !== -1) {
					return 'no_special_first_char';
				}
			}
			if (rules.maxLength30) {
				if (value.length > 30) {
					return 'max_length_30';
				}
			}
			if (rules.maxLength64) {
				if (value.length > 64) {
					return 'max_length_64';
				}
			}
			if (rules.noLeadingWhitespace) {
				if (value.match(/^\s/)) {
					return 'no_leading_whitespace';
				}
			}
			if (rules.noTrailingWhitespace) {
				if (value.match(/\s+$/)) {
					return 'no_trailing_whitespace';
				}
			}
			if (rules.nonWhitespace) {
				if (value.match(/\s/)) {
					return 'non_whitespace';
				}
			}
			if (rules.noDoubleQuote) {
				if (value.match(/"/)) {
					return 'no_double_quote';
				}
			}
			if (rules.numericCharactersOnly) {
				if (value.match(/\D/)) {
					return 'non_numeric';
				}
			}
			if (rules.noURLEncodeChars) {
				const SPECIAL = /[:/<>#{}%`[\]\\^~|]/;
				if (SPECIAL.test(value) || value !== encodeURI(value)) {
					return 'non-url-encode';
				}
			}
		}
		return null;
	},

	fixURL(url) {
		let ret = url;
		// strip trailing slashes
		while (ret && ret.length && ret.charAt(ret.length - 1) === '/') {
			ret = ret.substring(0, ret.length - 1);
		}
		return ret;
	},

	/**
	 * Makes sure any raw error data that should be displayed in the UI looks clean.  Filters out stuff the user doesn't care about, leaving only what's
	 * important. Typically used to collect the content for `show error details` links in notifications.
	 * @param {TranslatedError|string|object} details Detailed error information to filter.
	 * @param {function} translate A translation function.
	 * @return {string} A raw string that can be dumped into the UI.
	 */
	formatErrorDetails(details, translate) {
		// Translated Errors should have details about the error attached to them as properties.  Just need to remove the error name and translation info, and
		// our existing processing logic should be good to go.
		if (details instanceof Error && details.translation) {
			const error_friendly = `${details}`; // ex. "REQUEST_FAILED: Request to <url> failed"
			details = { ...details };
			// No need to render the error message on validation errors.  Just show the validation errors.
			const isValidationError = details.name === VALIDATION_ERRORS.API_INPUT_VALIDATION_FAILED;
			delete details.name;
			delete details.translation;

			return (
				<div>
					{!isValidationError && <div key="error">{Helper.formatErrorDetails(error_friendly, translate)}</div>}
					<div key="error_details">{Helper.formatErrorDetails(details, translate)}</div>
				</div>
			);
		}

		// ValidationErrors will have an attached list of TranslatedErrors
		if (details.validation_errors) {
			return details.validation_errors.map((v_err, index) => {
				let title = v_err && v_err.translation && v_err.translation.title;
				const params = v_err && v_err.translation && v_err.translation.params;
				let message = v_err && v_err.translation && v_err.translation.message;
				title = title ? translate(title, params) : '';
				message = message ? translate(message, params) : '';
				return <div key={`v_err_${index}`}>{translate('in_val_display_format', { title, message })}</div>;
			});
		}

		// Code that hasn't been updated to support translated Errors will be throwing strings, objects, and who knows what else
		if (_.isString(details)) {
			return details;
		}
		if (_.isArray(details)) {
			return (
				<div>
					{details.map((detail, index) => {
						return <div key={index}>{Helper.formatErrorDetails(detail, translate)}</div>;
					})}
				</div>
			);
		}

		let msg = _.get(details, 'response.msg');
		if (!msg) msg = _.get(details, 'msg');

		// orderer response comes back in an array
		if (_.isArray(msg)) {
			if (msg[0].code) {
				return msg[0].code;
			}
			let crstatus = _.get(msg[0], 'crstatus.message', '');
			return crstatus;
		}

		// peer and CA response
		if (msg) {
			if (msg.code) {
				return msg.code;
			}

			if (typeof msg === 'string') {
				return '"' + msg + '"';
			}

			let message = _.get(msg, 'message');
			let crstatus = _.get(msg, 'crstatus.message', '');
			return message || crstatus;
		}

		// stitch calls return _large_ error objects, so we try to highlight the bits that are important.
		if (details.stitch_msg) {
			return details.stitch_msg;
		}
		const grpc = _.get(details, 'grpc_resp.statusMessage');
		if (grpc) {
			return grpc;
		}

		// If this object isn't from stitch, just print it out
		const json = JSON.stringify({
			...details,
			title: undefined, // Filter out titles, which should already be rendered as part of the SidePanelError
		});
		if (json !== '{}') {
			return json;
		}
		// This must be an empty object.  Just don't show details if there's nothing important to show.
	},

	readLocalTextFile(file, limit) {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.onprogress = event => {
				if (limit && event.loaded > limit) {
					reader.abort();
					reject('file_too_big');
				}
			};
			reader.onerror = event => {
				reader.abort();
				reject(event.target.error);
			};
			reader.onload = () => {
				let text = reader.result;
				if (limit && text.length > limit) {
					reject('file_too_big');
				} else {
					resolve(text);
				}
			};
			reader.readAsText(file);
		});
	},

	readLocalJsonFile(file) {
		return new Promise((resolve, reject) => {
			const result = {
				file: file,
				json: null,
				error: null,
			};
			Helper.readLocalTextFile(file, JSON_LIMIT)
				.then(text => {
					try {
						result.json = JSON.parse(text);
					} catch (error) {
						result.error = error;
					}
					resolve(result);
				})
				.catch(error => {
					result.error = error;
					resolve(result);
				});
		});
	},

	renderHSMSummary(translate, hsm) {
		return (
			<div className="hsm-summary">
				{Helper.renderFieldSummary(translate, hsm, 'hsm_label', 'label')}
				{Helper.renderFieldSummary(translate, hsm, 'hsm_pin', 'pin', true)}
				{Helper.renderFieldSummary(translate, hsm, 'hsm_pkcs11endpoint', 'pkcs11endpoint')}
			</div>
		);
	},

	// dsh todo this is a mess, who wrote this? why aren't we looking at the datatype of value...
	renderFieldSummary(translate, props, label, field, hidden, number, defaultValue) {
		if (!field) {
			field = label;
		}
		let value = _.get(props, field);
		if (typeof value === 'boolean') {
			value = value ? 'enabled' : 'disabled';		// hack, otherwise the summary is not showing fields that are false
		}
		if (!value) {
			return;
		}
		let isDefault = false;
		if (defaultValue !== undefined) {
			isDefault = value === defaultValue;
		}
		if (number) {
			const lang = document.documentElement.getAttribute('lang');
			value = Number(value).toLocaleString(lang);
		}
		if (field === 'usage_total_memory') {
			value = value + ' M';
		}
		if (field === 'usage_total_storage') {
			value = value + ' Gi';
		}
		if (field === 'role_type') {
			value = translate('summary_role_type', value[0]);
		}
		if (field === 'ca_database') {
			value = translate(value);
		}
		if (field === 'statedb') {
			value = translate(value);
		}
		const filename = _.get(props, 'filenames.' + field);
		if (filename) {
			value = filename;
		}
		if (value.display_name) {
			value = value.display_name;
		}
		if (value.name) {
			value = value.name;
		}
		if (_.isArray(value)) {
			let a = [];
			value.forEach(v => {
				if (v && v.display_name) {
					a.push(v.display_name);
					return;
				}
				if (v && v.name) {
					a.push(v.name);
					return;
				}
				a.push(v);
			});
			value = a.join(', ');
		}
		if (isDefault) {
			value = value + ' ' + translate('default_value');
		}
		if (!_.isString(value)) {
			value = '' + value;
		}

		let label_txt = translate(label);
		if (label_txt && label_txt[label_txt.length - 1] !== ':') {	// add colon to end of field if it doesn't have one...
			label_txt += ':';
		}

		if (hidden) {
			return (
				<div className="summary-section">
					<HiddenText id={'summary_' + field}
						label={label_txt}
						labelClassName="summary-label"
						text={value}
						className="summary-value"
					/>
				</div>
			);
		}
		return (
			<div className="summary-section">
				<p className="summary-label">{label_txt}</p>
				<p className={'summary-value' + (filename ? ' summary-nowrap' : '')}>{value}</p>
			</div>
		);
	},

	normalizeCpu(cpu, count) {
		let normalized = '0';
		if (!count) {
			count = 1;
		}
		if (cpu) {
			let work = Number(cpu);
			if (isNaN(work)) {
				work = 0;
			}
			if (cpu.match(/m$/)) {
				work = Number(cpu.substring(0, cpu.length - 1));
				if (isNaN(work)) {
					work = 0;
				} else {
					work = work / 1000;
				}
			}
			if (cpu.match(/n$/)) {
				work = Number(cpu.substring(0, cpu.length - 1));
				if (isNaN(work)) {
					work = 0;
				} else {
					work = work / (1000 * 1000 * 1000);
				}
			}
			normalized = Math.floor(count * work * 1000) / 1000;
		}
		return normalized;
	},

	isCertAvailable(opts) {
		return !_.isEmpty(opts.client_prv_key_b64pem);
	},

	normalizeMemory(memory, suffix, count) {
		let normalized = '0' + suffix;
		if (!count) {
			count = 1;
		}
		if (memory) {
			const unit = memory.match(/[EPTGMK]i{0,1}$/);
			let work = Number(memory);
			if (isNaN(work)) {
				work = 0;
			}
			if (unit && unit[0]) {
				work = Number(memory.substring(0, memory.length - unit[0].length));
				if (isNaN(work)) {
					work = 0;
				}
				switch (unit[0]) {
					case 'K':
						work = work * 1000;
						break;
					case 'Ki':
						work = work * 1024;
						break;
					case 'M':
						work = work * 1000 * 1000;
						break;
					case 'Mi':
						work = work * 1024 * 1024;
						break;
					case 'G':
						work = work * 1000 * 1000 * 1000;
						break;
					case 'Gi':
						work = work * 1024 * 1024 * 1024;
						break;
					case 'T':
						work = work * 1000 * 1000 * 1000 * 1000;
						break;
					case 'Ti':
						work = work * 1024 * 1024 * 1024 * 1024;
						break;
					case 'P':
						work = work * 1000 * 1000 * 1000 * 1000 * 1000;
						break;
					case 'Pi':
						work = work * 1024 * 1024 * 1024 * 1024 * 1024;
						break;
					case 'E':
						work = work * 1000 * 1000 * 1000 * 1000 * 1000 * 1000;
						break;
					case 'Ei':
						work = work * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
						break;
					default:
						break;
				}
			}
			switch (suffix) {
				case 'K':
					work = work / 1000;
					break;
				case 'Ki':
					work = work / 1024;
					break;
				case 'M':
					work = work / (1000 * 1000);
					break;
				case 'Mi':
					work = work / (1024 * 1024);
					break;
				case 'G':
					work = work / (1000 * 1000 * 1000);
					break;
				case 'Gi':
					work = work / (1024 * 1024 * 1024);
					break;
				case 'T':
					work = work / (1000 * 1000 * 1000 * 1000);
					break;
				case 'Ti':
					work = work / (1024 * 1024 * 1024 * 1024);
					break;
				case 'P':
					work = work / (1000 * 1000 * 1000 * 1000 * 1000);
					break;
				case 'Pi':
					work = work / (1024 * 1024 * 1024 * 1024 * 1024);
					break;
				case 'E':
					work = work / (1000 * 1000 * 1000 * 1000 * 1000 * 1000);
					break;
				case 'Ei':
					work = work / (1024 * 1024 * 1024 * 1024 * 1024 * 1024);
					break;
				default:
					break;
			}
			normalized = Math.floor(work * count * 1000 + 0.5) / 1000 + ' ' + suffix;
		}
		return normalized;
	},

	decodeb64(b64string) {
		if (!b64string) {
			return null;
		}
		return atob(b64string);
	},

	is_populated_array(thing) {
		return thing && Array.isArray(thing) && thing.length > 0;
	},

	formatNumber(value) {
		const lang = document.documentElement.getAttribute('lang');
		const opts = { useGrouping: false };
		let num = Number(value);
		if (isNaN(num)) {
			num = Number(0);
		}
		return num.toLocaleString(lang, opts);
	},

	/**
	 * Format timestamp in ms to x.x FRIENDLY_UNITS. ex: 6.4 mins, or 2.0 secs (negative values become 0)
	 * @param {number} ms A timestamp in milliseconds.
	 * @param {function} translate A translate function to support localization.
	 * @param {number} [digits] The number of digits to pass to toFixed.  Defaults to 1.
	 * @return {string} A localized, friendly string representing the given time quantity.
	 */
	friendly_ms(ms, translate, digits) {
		let ret = '';
		if (digits !== 0) digits = digits ? digits : 1;
		ms = Number(ms);
		if (isNaN(ms)) {
			ret = translate('friendly_ms_unknown');
		} else if (ms <= 0) {
			ret = translate('friendly_ms_secs', { seconds: 0 });
		} else if (ms > 24 * 60 * 60 * 1000) {
			//format for days
			ret = translate('friendly_ms_days', { days: (ms / 1000 / 60 / 60 / 24).toFixed(digits) });
		} else if (ms > 60 * 60 * 1000) {
			//format for hours
			ret = translate('friendly_ms_hrs', { hours: (ms / 1000 / 60 / 60).toFixed(digits) });
		} else if (ms > 60 * 1000) {
			//format for mins
			ret = translate('friendly_ms_mins', { minutes: (ms / 1000 / 60).toFixed(digits) });
		} else if (ms > 1000) {
			//format for secs
			ret = translate('friendly_ms_secs', { seconds: (ms / 1000).toFixed(digits) });
		} else {
			//format to ms
			ret = translate('friendly_ms_ms', { millisecs: ms.toFixed(digits) });
		}
		return ret;
	},

	isChanged(fields, data, props, node) {
		let changed = false;
		fields.forEach(field => {
			if (!field.readonly) {
				let current = data[field.name] ? data[field.name] : props[field.name];
				let original = node[field.name];
				if (field.name === 'replica_set_cnt') {
					original = node.replicas || 1;
				}
				if (field.name === 'grpcwp_url') {
					current = _.toLower(current);
					original = _.toLower(original);
				}
				if (current !== original) {
					changed = true;
				}
			}
		});
		return changed;
	},

	checkPropertyForUpdate(node_update, props, props_property, node, node_property) {
		if (!node_property) {
			node_property = props_property;
		}
		const current = props && _.get(props, props_property);
		const original = node && _.get(node, node_property);
		if (current !== original) {
			_.set(node_update, node_property, current);
		}
	},

	checkIfOnlyOrdererSignatureRequired(json_diff) {
		if (json_diff) {
			// checking if channel update has any member updates
			if (json_diff.members) {
				const current_members = this.getMembersWithRoles(json_diff.members.current);
				const updated_members = this.getMembersWithRoles(json_diff.members.updated);
				for (let msp_id in updated_members) {
					if (!current_members[msp_id]) {
						return false; // member added
					} else {
						if (current_members[msp_id] !== updated_members[msp_id]) {
							return false; // member updated
						}
					}
				}
				for (let msp_id in current_members) {
					if (!updated_members[msp_id]) {
						return false; // member removed
					}
				}
			}

			// check policy updates
			if (json_diff.policy) {
				let current = _.get(json_diff, 'policy.current', {});
				let updated = _.get(json_diff, 'policy.updated', {});
				if (current.n !== updated.n || current.outOf !== updated.outOf) {
					return false; // policy updated
				}
			}

			// check acl updates
			if (json_diff.acl) {
				let current = _.get(json_diff, 'acl.current', {});
				let updated = _.get(json_diff, 'acl.updated', {});
				for (let resource in updated) {
					if (!current[resource]) {
						return false; // acl added
					} else {
						if (current[resource].policy_ref !== updated[resource].policy_ref) {
							return false; // acl updated
						}
					}
				}
				for (let resource in current) {
					if (!updated[resource]) {
						return false; // acl removed
					}
				}
			}

			// check capability updates
			if (json_diff.capabilities) {
				let currentCapabilities = json_diff.capabilities.current;
				let current = {
					application: Object.keys(currentCapabilities.application)[0],
				};
				let updatedCapabilities = json_diff.capabilities.updated;
				let updated = {
					application: Object.keys(updatedCapabilities.application)[0],
				};
				if (current.application !== updated.application) {
					return false; // application capability updated
				}
			}

			return true; // No updates to members/policy/acl/application capability
		} else return false;
	},

	getMembersWithRoles(data) {
		const roles = {};
		data.Admins.policy.value.identities.forEach(id => {
			const msp_id = id.principal.msp_identifier;
			if (!roles[msp_id]) {
				roles[msp_id] = '';
			}
			roles[msp_id] = roles[msp_id] + 'a';
		});
		data.Writers.policy.value.identities.forEach(id => {
			const msp_id = id.principal.msp_identifier;
			if (!roles[msp_id]) {
				roles[msp_id] = '';
			}
			roles[msp_id] = roles[msp_id] + 'w';
		});
		data.Readers.policy.value.identities.forEach(id => {
			const msp_id = id.principal.msp_identifier;
			if (!roles[msp_id]) {
				roles[msp_id] = '';
			}
			roles[msp_id] = roles[msp_id] + 'r';
		});
		return roles;
	},

	getFormattedCapabilities(capabilities) {
		let formattedCapabilities = capabilities.map(x => {
			let dot_version = semver.coerce(x.replace(/_/g, '.')).version;
			return { id: x, name: dot_version, value: dot_version };
		});
		formattedCapabilities.sort((a, b) => {
			return naturalSort(a.id, b.id);
		});
		formattedCapabilities.reverse();
		return formattedCapabilities;
	},

	// turn fabric config-block keys for capabilities into a 3 part version string
	// these strings match formats seen in fabric docs:
	//  https://hyperledger-fabric.readthedocs.io/en/release-2.2/capabilities_concept.html#node-versions-and-capability-versions
	// 'V2_0' -> 'v2.0.0'
	// '2.0.0' -> 'v2.0.0'
	// 'V1_4_2' -> 'v1.4.2'
	prettyPrintPolicy(str) {
		if (typeof str === 'string') {
			str = str.trim();
			if (str[0].toUpperCase() === 'V') {
				str = str.substring(1);			// cut off the 'V'
			}
			const parts = str.includes('_') ? str.split('_') : str.split('.');
			while (parts.length < 3) {
				parts.push('0');
			}
			return 'v' + parts.join('.');
		}
		return '-';
	},

	// '2.0.0' -> 'v2.0.0'
	// '2.0.0-5' -> 'v2.0.0-5'
	// 'V2.0.0-5' -> 'v2.0.0-5'
	prettyPrintVersion(str) {
		return this.prettyPrintPolicy(str);
	},

	readLocalBinaryFile(file, limit) {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.onprogress = event => {
				if (event.loaded > limit) {
					reader.abort();
					reject('input_error_file_too_big');
				}
			};
			reader.onerror = event => {
				reader.abort();
				reject(event.target.error);
			};
			reader.onload = () => {
				let buffer = new Buffer(reader.result, 'binary');
				if (buffer.length > limit) {
					reject('input_error_file_too_big');
				} else {
					resolve(buffer);
				}
			};
			reader.readAsArrayBuffer(file);
		});
	},

	async calculateFileHash(fileBuffer) {
		const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		return hashHex;
	},

	/**
	 * Extracts a gzipped tar archive to a given buffer.
	 * @param {string|Buffer|stream.Readable} input - A readable stream, buffer or string containing the gzipped tar archive.
	 * @returns {Promise<Array>} A promise that resolves with an array of objects representing each file in the tar archive.
	 */
	async extractTargz(input) {
		const unzip = zlib.createGunzip();

		if (Buffer.isBuffer(input)) {
			unzip.end(input);
		} else {
			input.pipe(unzip);
		}

		const extract = tarStream.extract();
		const files = [];

		extract.on('entry', (header, stream, cb) => {
			const chunk = [];

			stream.on('data', data => chunk.push(data));
			stream.on('end', () => {
				const file = {
					data: Buffer.concat(chunk),
					mode: header.mode,
					mtime: header.mtime,
					path: header.name,
					type: header.type
				};

				if (header.type === 'symlink' || header.type === 'link') {
					file.linkname = header.linkname;
				}

				files.push(file);
				cb();
			});
		});

		if (Buffer.isBuffer(unzip)) {
			extract.end(unzip);
		} else {
			unzip.pipe(extract);
		}

		return new Promise((resolve, reject) => {
			if (!Buffer.isBuffer(unzip)) {
				unzip.on('error', reject);
			}

			extract.on('finish', () => resolve(files));
			extract.on('error', reject);
		});

	},

	async readLocalChaincodePackageFile(file) {
		const buffer = await Helper.readLocalBinaryFile(file, CHAINCODE_LIMIT);
		const uint8 = new Uint8Array(buffer);
		const files = await this.extractTargz(buffer);
		let pkg_id = null;
		let pkg_version = null;
		let metadata = null;
		for (let i = 0; i < files.length; i++) {
			if (files[i].path === 'metadata.json') {
				const blob = new Blob([files[i].data], { type: 'application/json;' });
				const result = await Helper.readLocalJsonFile(blob);
				metadata = result.json;
				if (metadata && metadata.label) {
					let parts = metadata.label.split('_');
					if (parts.length > 0) pkg_id = parts[0];
					if (parts.length > 1) pkg_version = parts[1];
				}
				if (!pkg_version) {
					//use name of the file from VSCode - abc@1.4.5.tar.gz
					let regexp = /@(.*?).tar/g;
					let matchAll = file.name.matchAll(regexp);
					matchAll = Array.from(matchAll);
					pkg_version = _.get(matchAll, '[0][1]', null);
				}
			}
		}

		const result = {
			metadata,
			uint8,
			pkg_id,
			pkg_version,
		};
		return result;
	},

	// To handle the naming inconsistency of the bccsp default property for CA/peer/orderer
	// There are 3 variations currently - BCCSP.default, BCCSP.Default and bccsp.default. Added bccsp.Default to be on safe side
	getHSMBCCSP(bccsp) {
		const defaultVal = _.get(bccsp, 'BCCSP.default') || _.get(bccsp, 'BCCSP.Default') || _.get(bccsp, 'bccsp.default') || _.get(bccsp, 'bccsp.Default');
		return defaultVal;
	},

	wait(time) {
		return new Promise((resolve, reject) => {
			window.setTimeout(() => {
				resolve();
			}, time);
		});
	},

	getCapabilityHighestVersion(capabilitiesObject) {
		if (!capabilitiesObject) return;
		const versions = Object.keys(capabilitiesObject);
		let highest = '';
		versions.forEach(version => {
			const revised = version.replace(/_/g, '.');
			if (highest) {
				try {
					if (semver.lt(semver.coerce(highest), semver.coerce(revised))) {
						highest = revised;
					}
				} catch (err) {
					console.error(err);
				}
			} else {
				highest = revised;
			}
		});
		return highest;
	},

	// return array of nodes that are using  a fabric version older than v2.0
	getPre20Nodes(nodes) {
		let pre20Nodes = [];
		nodes.forEach(node => {
			if (!node.version) {
				console.error('cannot check if node is older than v2 b/c node does not have a "version" field', node);
			} else if (this.version_matches_pattern('1.4.x', node.version)) {
				pre20Nodes.push({
					name: node.display_name || node.name,
					version: node.version || '1.4.x',
				});
			}
		});
		return pre20Nodes;
	},

	// check if the user has the right fabric versions on each relevant peer/orderer for the capability selected
	validateCapability20Update(applicationCapability, ordererCapability, channelCapability, channelPeers, channelOrderers) {
		let channel_warning_20 = false;
		let channel_warning_20_details = [];

		const is20Orderer = ordererCapability ? ordererCapability.indexOf('V2') === 0 : false;
		const is20App = applicationCapability ? applicationCapability.indexOf('V2') === 0 : false;
		const is20Channel = channelCapability ? channelCapability.indexOf('V2') === 0 : false;

		const channelPre20Peers = channelPeers ? this.getPre20Nodes(channelPeers) : [];
		const channelPre20Orderers = channelOrderers ? this.getPre20Nodes(channelOrderers) : [];
		const isAllPeerNodes20 = _.size(channelPre20Peers) === 0;
		const isAllOrdererNodes20 = _.size(channelPre20Orderers) === 0;

		if (is20App && !isAllPeerNodes20) {
			channel_warning_20 = true;
			channel_warning_20_details.push({
				type: 'application',
				nodes: channelPre20Peers,
			});
		}
		if (is20Orderer && !isAllOrdererNodes20) {
			channel_warning_20 = true;
			channel_warning_20_details.push({
				type: 'orderer',
				nodes: channelPre20Orderers,
			});
		}
		if (is20Channel && (!isAllOrdererNodes20 || !isAllPeerNodes20)) {
			channel_warning_20 = true;
			channel_warning_20_details.push({
				type: 'channel',
				nodes: channelPre20Peers.concat(channelPre20Orderers),
			});
		}

		return {
			channel_warning_20,
			channel_warning_20_details,
		};
	},

	isTLSCertMismatch(consenter, node) {
		if (node) {
			if (node.client_tls_cert && node.client_tls_cert !== consenter.client_tls_cert) return true;
			if (node.server_tls_cert && node.server_tls_cert !== consenter.server_tls_cert) return true;
		}
		return false;
	},

	// concat two array fields together
	safer_concat(array1, array2) {
		if (typeof array1 === 'string') {
			array1 = [array1];						// make array of 1 if its just a string
		}
		if (typeof array2 === 'string') {
			array2 = [array2];						// make array of 1 if its just a string
		}
		if (!Array.isArray(array1)) {
			array1 = [];							// init empty array if null/anything else
		}
		if (!Array.isArray(array2)) {
			array2 = [];							// init empty array if null/anything else
		}
		return array1.concat(array2);
	},

	// mimic the moment-js.fromNow() function - returns text indicating how much time has elapsed from the input timestamp
	fromNow(utc_timestamp_ms, translate) {
		let ret = '';
		const ms = Date.now() - Number(utc_timestamp_ms);
		if (isNaN(ms)) {
			ret = translate('friendly_ms_unknown_ago');
		} else if (ms < -365 * 24 * 60 * 60 * 1000) {
			//format for years
			ret = translate('friendly_ms_years', { years: (-1 * ms / 1000 / 60 / 60 / 24 / 365).toFixed(0) });
		} else if (ms < -30 * 24 * 60 * 60 * 1000) {
			//format for months
			ret = translate('friendly_ms_months', { months: (-1 * ms / 1000 / 60 / 60 / 24 / 30).toFixed(0) });
		} else if (ms < -24 * 60 * 60 * 1000) {
			//format for days
			ret = translate('friendly_ms_days', { days: (-1 * ms / 1000 / 60 / 60 / 24).toFixed(0) });
		} else if (ms < -60 * 60 * 1000) {
			//format for hours
			ret = translate('friendly_ms_hrs', { hours: (-1 * ms / 1000 / 60 / 60).toFixed(0) });
		} else if (ms < -60 * 1000) {
			//format for mins
			ret = translate('friendly_ms_mins', { minutes: (-1 * ms / 1000 / 60).toFixed(0) });
		} else if (ms < -1000) {
			//format to seconds
			ret = translate('friendly_ms_secs', { seconds: (-1 * ms).toFixed(0) });
		} else if (ms > 365 * 24 * 60 * 60 * 1000) {
			//format for years
			ret = translate('friendly_ms_years_ago', { years: (ms / 1000 / 60 / 60 / 24 / 365).toFixed(0) });
		} else if (ms > 30 * 24 * 60 * 60 * 1000) {
			//format for months
			ret = translate('friendly_ms_months_ago', { months: (ms / 1000 / 60 / 60 / 24 / 30).toFixed(0) });
		} else if (ms > 24 * 60 * 60 * 1000) {
			//format for days
			ret = translate('friendly_ms_days_ago', { days: (ms / 1000 / 60 / 60 / 24).toFixed(0) });
		} else if (ms > 60 * 60 * 1000) {
			//format for hours
			ret = translate('friendly_ms_hrs_ago', { hours: (ms / 1000 / 60 / 60).toFixed(0) });
		} else if (ms > 60 * 1000) {
			//format for mins
			ret = translate('friendly_ms_mins_ago', { minutes: (ms / 1000 / 60).toFixed(0) });
		} else if (ms > 1000) {
			//format for secs
			ret = translate('friendly_ms_secs_ago', { seconds: (ms / 1000).toFixed(0) });
		} else {
			//format to ms
			ret = translate('friendly_ms_ms_ago', { millisecs: ms.toFixed(0) });
		}
		return ret;
	},

	// -----------------------------------------------------
	// decide if version strings with wildcards match with the version - example: pattern="1.4.x", value="1.4.9" would return true
	// -----------------------------------------------------
	version_matches_pattern(pattern, value) {
		pattern = (typeof pattern === 'number') ? pattern.toString() : pattern;							// safer...
		value = (typeof value === 'number') ? value.toString() : value;
		pattern = (typeof pattern === 'string') ? pattern.trim() : '';									// safer...
		value = (typeof value === 'string') ? value.trim() : '';

		pattern = (pattern[0].toLowerCase() === 'v') ? pattern.substring(1) : pattern;					// strip of leading V, like v1.4.9
		value = (value[0].toLowerCase() === 'v') ? value.substring(1) : value;

		let version_parts_pattern = pattern ? pattern.trim().replace(/-/g, '.').split('.') : null;		// treat 0.2.4-1 like 0.2.4.1
		let version_parts_val = value ? value.trim().replace(/-/g, '.').split('.') : null;

		if (version_parts_pattern === null || version_parts_val == null) {
			return null;
		}

		// make them the same length
		for (; version_parts_pattern.length < version_parts_val.length;) { version_parts_pattern.push('x'); }
		for (; version_parts_val.length < version_parts_pattern.length;) { version_parts_val.push('0'); }

		// iter on each digit
		for (let i in version_parts_pattern) {
			if (version_parts_pattern[i] === 'x') {										// if we made it to the 'x' then its a match
				return true;
			} else if (version_parts_pattern[i] !== version_parts_val[i]) {				// if these digits don't match, the versions do not match
				return false;
			} else {
				// if these digits match, move to the next digit
			}
		}
		return true;		// if all digits match... its a match
	},

	// there seems to be confusion if/when this field is a string vs boolean, this handles both
	// returns true if fabric_node_ous.enable is true
	node_ou_is_enabled(data) {
		if (data && data.fabric_node_ous) {
			if (data.fabric_node_ous.enable === true) {
				return true;
			}
			if (data.fabric_node_ous.enable === 'enabled') {
				return true;
			}
		}
		return false;
	},

	// returns true if the component was imported to this console
	is_imported(node_obj) {
		if (node_obj && node_obj.imported === false) {			// better way
			return false;
		}
		if (node_obj && node_obj.location === 'ibm_saas') {		// legacy way
			return false;
		}
		return true;
	},

	// format the object into a valid query parameter
	formatObjAsQueryParams(obj) {
		let query = '';
		for (let key in obj) {
			if (key === 'key' || key === 'keys') {
				query += key + '=' + JSON.stringify(obj[key]) + '&';
			} else if (typeof obj[key] !== 'object') {
				query += key + '=' + obj[key] + '&';
			} else {
				query += key + '=' + JSON.stringify(obj[key]) + '&';
			}
		}
		if (query !== '') {
			query = query.substring(0, query.length - 1);	// remove last "&"
		}
		return (query === '') ? '' : '?' + query;			// add leading "?" if we are sending query parameter data
	}
};

export default Helper;
