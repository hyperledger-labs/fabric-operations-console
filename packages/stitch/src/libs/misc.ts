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

// libs
import { load } from 'protobufjs';

declare const window: any;
const logger = getLogger();
let __pb_root = <any>null;

// Libs built by us
import { IdentitiesLib } from './proto_handlers/identities_pb_lib';
import { scGetHashAsHex } from './subtle_crypto';

// exports
export { logger, getLogger, pp, load_pb, __pb_root };
export { uint8ArrayToStr, utf8StrToUint8Array, arrToUint8Array, uint8ArrayToHexStr, hexStrToUint8Array, generate_tx_id, base64toHexStr, url_join };
export { base64ToUint8Array, base64ToUtf8, sortObjectOut, uint8ArrayToBase64, isUint8Array, underscores_2_camelCase, friendly_ms, sort_keys, camelCase_2_underscores };

// ------------------------------------------
// Load the protobuf json bundle - this is used to encode/decode protos (used by the "protobuf.js" lib)
// ------------------------------------------
function load_pb(cb: Function | null) {
	if (__pb_root) {
		if (cb) { return cb(__pb_root); }											// already loaded, return what we have
	} else {
		load('/v2.0-protobuf-bundle.json', function (err, root) {						// go get it
			if (err) {
				load('/base/dist/v2.0-protobuf-bundle.json', function (err2, root2) {	// we didn't find it, try this path. (test suite uses this)
					if (err2) {
						logger.error('[stitch] could not load protobuf-bundle, this will be problematic', err);	// error out
						if (cb) { return cb(null); }
					} else {
						__pb_root = root2;											// set it, used later
						if (cb) { return cb(root2); }
					}
				});
			} else {
				__pb_root = root;													// set it, used later
				if (cb) { return cb(root); }
			}
		});
	}
}

// --------------------------------------------------------------------------------
// pretty print JSON - truncates long objects!
// --------------------------------------------------------------------------------
function pp(value: object | undefined | null) {
	try {
		let temp = JSON.stringify(value, null, '\t');
		if (temp && temp.length >= 25000) {
			temp = temp.substring(0, 25000) + '... [too long, truncated the rest]';
		}
		return temp;
	} catch (e) {
		return value;
	}
}

// --------------------------------------------------------------------------------
// Find/configure a logger to use
// --------------------------------------------------------------------------------
function getLogger() {
	if (!window.log || !window.log.debug) {			// if we do not have a logger use console.log
		console.warn('logger does not exist, using console...');
		// tslint:disable-next-line: no-console
		console.trace = console.log;
		// tslint:disable-next-line: no-console
		console.debug = console.log;
		// tslint:disable-next-line: no-console
		console.info = console.log;
		return console;
	} else {
		return window.log;							// if we have a logger, use it
	}
}

// --------------------------------------------------------------------------------
// Test if array is a Uint8Array or not
// --------------------------------------------------------------------------------
function isUint8Array(x: any) {
	if (!x || !x.constructor) {
		return false;
	} else {
		if (x.constructor.name === 'Array') {							// this is okay
			return true;
		}
		if (x._isBuffer === true || x.constructor.name === 'Buffer') {	// this is okay (the minify-er seems to mess up constructor name..., use _isBuffer)
			return true;
		}
		return (x.constructor.name === 'Uint8Array');					// this is better
	}
}

// --------------------------------------------------------------------------------
// Generate a new transaction id - [do NOT change the logic] fabric expects the id to be built using this logic - 09/06/2018
// --------------------------------------------------------------------------------
/*
	opts: {
		client_cert_pem: "string",
		msp_id: "string",
		nonce: Uint8Array
	}
*/
function generate_tx_id(opts: any, cb: Function) {
	const p_serializedIdentity = (new IdentitiesLib).p_build_serialized_identity({ msp_id: opts.msp_id, client_cert_pem: opts.client_cert_pem });
	const serializedIdentity = p_serializedIdentity.serializeBinary();

	let id_bytes = new Uint8Array(serializedIdentity.length + opts.nonce.length);
	id_bytes.set(opts.nonce);								// add the nonce bytes first
	id_bytes.set(serializedIdentity, opts.nonce.length);	// then append the serialized id bytes
	scGetHashAsHex(id_bytes, (error: any, hex_str: string) => {
		return cb(error, hex_str);
	});
}

// --------------------------------------------------------------------------------
// Convert string to Uint8Array - note this only works on strings that can be represented with utf 8
// --------------------------------------------------------------------------------
function utf8StrToUint8Array(str: string) {
	let ret = new Uint8Array(0);

	if (str && typeof str === 'string') {				// if its a string
		ret = new Uint8Array(str.length);
		for (let pos = 0; pos < str.length; pos++) {
			ret[pos] = str.charCodeAt(pos) & 255;
		}
	} else {
		logger.error('[stitch] error parsing str to uint8array. input is not of type string');
	}
	return ret;
}

// --------------------------------------------------------------------------------
// Convert any array to Uint8Array - note this only works on arrays that have values less than 256
// --------------------------------------------------------------------------------
function arrToUint8Array(arr: any) {		// dsh don't use this unless you cannot cast it.
	let ret = new Uint8Array(0);

	if (!arr) {
		logger.warn('[stitch] input is empty, cannot convert to Uint8Array.');
	} else if (!isUint8Array(arr)) {		// cannot use regular typeof checks for Uint8Array
		logger.error('[stitch] input is not a suitable array, cannot convert thing to Uint8Array:', (arr) ? arr.constructor : null);
	} else {								// if its a non-typed array
		ret = new Uint8Array(arr.length);
		for (let pos = 0; pos < arr.length; pos++) {
			ret[pos] = arr[pos] & 255;
		}
	}
	return ret;
}

// --------------------------------------------------------------------------------
// Convert Uint8Array to a string - note this only works on strings that can be represented with ascii
// --------------------------------------------------------------------------------
function uint8ArrayToStr(arr: Uint8Array) {
	let ret = '';
	for (let pos in arr) {
		ret += String.fromCharCode(arr[pos] & 255);
	}
	return ret;
}

// --------------------------------------------------------------------------------
// Convert Base64 string to a utf8 string (utf8/unicode support)
// --------------------------------------------------------------------------------
function base64ToUtf8(str: string) {
	if (typeof str === 'string') {
		return decodeURIComponent(Array.prototype.map.call(atob(str), function (c: string) {
			return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);		// create a URI encoded character from each byte
		}).join(''));
	}
	return '';
}

// --------------------------------------------------------------------------------
// Convert Uint8Array to a string in hexadecimal (every 2 characters (8 bits) is separated with a space)
// --------------------------------------------------------------------------------
function uint8ArrayToHexStr(arr: Uint8Array, noWhiteSpace: boolean) {
	let ret = '';

	if (!isUint8Array(arr)) {				// cannot use regular typeof checks for Uint8Array
		logger.error('[stitch] input is not a suitable array, cannot convert array to hex str', (arr) ? arr.constructor : null);
	} else {
		for (let pos in arr) {
			let temp = arr[pos].toString(16).toUpperCase();
			if (temp.length <= 1) {
				temp = '0' + temp;			// left pad a '0'
			}
			ret += temp + (noWhiteSpace ? '' : ' ');
		}
	}
	return ret.trim();
}

// --------------------------------------------------------------------------------
// Convert string in hexadecimal to uint8Array
// --------------------------------------------------------------------------------
function hexStrToUint8Array(hex: string) {
	let ret = new Uint8Array(0);

	if (hex && typeof hex === 'string') {						// if its a string
		hex = hex.split(' ').join('');							// remove spaces if exist
		if (hex.length % 2 === 1) {								// if we are odd, we are missing a left padded 0
			hex = '0' + hex;									// make it even
		}
		ret = new Uint8Array(hex.length / 2);
		let ret_pos = 0;

		for (let pos = 0; pos < hex.length; ret_pos++) {
			if (hex[pos + 1] === undefined) {
				logger.error('[stitch] hold up, how can a hex string have a dangling digit if we made it even', ret_pos, pos, hex);
				// this should not happen.. but keeping it here just cause
				ret[ret_pos] = parseInt(hex[pos], 16);			// odd number of hex, so last character
			} else {
				ret[ret_pos] = parseInt(hex[pos] + hex[pos + 1], 16);	// concat two hex characters, convert to integer
			}
			pos += 2;											// two characters at a time
		}
	} else {
		logger.error('[stitch] error parsing hex str to uint8array. input is not of type string');
	}

	return ret;
}
/* works, but unused
function hexStrToUint32Array(hex: string) {
	let ret = new Uint32Array(0);

	if (hex && typeof hex === 'string') {				// if its a string
		hex = hex.split(' ').join('');					// remove spaces if exist
		ret = new Uint32Array(hex.length / 8);
		let ret_pos = 0;
		for (let pos = 0; pos < hex.length - 1; ret_pos++) {
			ret[ret_pos] =								// concat eight hex characters, convert to integer
				parseInt(hex[pos] + hex[pos + 1] + hex[pos + 2] + hex[pos + 3] + hex[pos + 4] + hex[pos + 5] + hex[pos + 6] + hex[pos + 7], 16);
			pos += 8;									// eight characters at a time
		}
	} else {
		logger.error('[stitch] error parsing hex str to Uint32Array. input is not of type string');
	}

	return ret;
}
*/

// --------------------------------------------------------------------------------
// Convert uint8Array to a base 64 string
// --------------------------------------------------------------------------------
function uint8ArrayToBase64(arr: Uint8Array) {
	if (!arr) {
		logger.warn('[stitch] input is empty, cannot convert to base 64 str.');	// happens when fabric gives us an empty resp, expected on some methods
	} else if (!isUint8Array(arr)) {											// cannot use regular typeof checks for Uint8Array
		logger.error('[stitch] input is not a suitable array, cannot convert thing to base 64 str:', (arr) ? arr.constructor : null);
	} else {
		try {
			return btoa(String.fromCharCode.apply(null, arr));
		} catch (e) {
			logger.error('[stitch] unable to parse uint8array', e);
		}
	}
	return '';
}

// --------------------------------------------------------------------------------
// Convert base 64 string to uint8Array
// --------------------------------------------------------------------------------
function base64ToUint8Array(base64: string) {
	//const map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	if (typeof base64 !== 'string') {
		logger.warn('[stitch] cannot convert to uint8array b/c is not a string', base64);
		return base64;
	} else {
		const binary = window.atob(base64);
		const ret = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			ret[i] = binary.charCodeAt(i);
		}
		return ret;

		/* manual way - not in use
		base64 = base64.replace(/=/g, '');
		const int = [];
		let i = 0;
		for (i = 0; i + 4 <= base64.length; i += 4) {		// every character is 6 bits, so every 4chars = 24bits = 3 bytes
			let three_bytes =
				((map.indexOf(base64[i + 3]) & 63)) +
				((map.indexOf(base64[i + 2]) & 63) << 6) +
				((map.indexOf(base64[i + 1]) & 63) << 12) +
				((map.indexOf(base64[i]) & 63) << 18);
			int.push((three_bytes >> 16) & 255);
			int.push((three_bytes >> 8) & 255);
			int.push((three_bytes) & 255);
		}

		const left = base64.length % 4;
		if (left === 3) {
			let three_bytes =
				((map.indexOf(base64[i + 2]) & 63) << 6) +
				((map.indexOf(base64[i + 1]) & 63) << 12) +
				((map.indexOf(base64[i]) & 63) << 18);
			int.push((three_bytes >> 16) & 255);
			int.push((three_bytes >> 8) & 255);
		}
		if (left === 2) {
			let three_bytes =
				((map.indexOf(base64[i + 1]) & 63) << 12) +
				((map.indexOf(base64[i]) & 63) << 18);
			int.push((three_bytes >> 16) & 255);
		}

		const ret = new Uint8Array(int.length);
		for (let x in int) { ret[x] = int[x]; }
		return ret;*/
	}
}

// convert base 64 string to uint8Array
function base64toHexStr(base64: string) {
	return uint8ArrayToHexStr(base64ToUint8Array(base64), true);
}

// --------------------------------------------------------------------------------
// Sort an object
// --------------------------------------------------------------------------------
function sortObjectOut(unsorted: any) {
	const MAX_DEPTH = 1000;
	return sortMeDummy(unsorted, 0);

	function sortMeDummy(un_sorted: any, depth: number) {
		const ordered = <any>{};
		if (!depth) { depth = 0; }										// depth is used for the pretty debug print, and circular detect

		if (depth >= MAX_DEPTH) {
			console.log('Error - sorting at max depth. Is the object circular... that no work', MAX_DEPTH);
			return ordered;												// maximum depth reached
		}
		if (isObject(un_sorted)) {
			Object.keys(un_sorted).sort(compareStrings).forEach(function (key) {
				ordered[key] = un_sorted[key];							// sort all the object's keys
			});
		}

		for (let i in ordered) {
			if (isObject(ordered[i])) {
				ordered[i] = sortMeDummy(ordered[i], depth + 1);		// sort all the object's object's keys
			}
		}
		return ordered;
	}

	function compareStrings(a: any, b: any) {
		return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
	}

	function isObject(o: any) {
		return o instanceof Object && o.constructor === Object;
	}
}

//------------------------------------------------------------
// Sort an object's key fields, RECURSIVE! (Order: Symbols, Numbers, Upper Case, Lower Case)
//------------------------------------------------------------
function sort_keys(unsorted: any) {
	let ordered = <any>{};
	if (isObject(unsorted)) {
		Object.keys(unsorted).sort(compareStrings).forEach(function (key) {
			ordered[key] = unsorted[key];							// sort all the object's keys
		});
	} else {
		return unsorted;
	}

	for (let i in ordered) {
		if (isObject(ordered[i])) {
			ordered[i] = sort_keys(ordered[i]);				// sort all the object's object's keys
		} else if (Array.isArray(ordered[i])) {
			for (let z in ordered[i]) {
				if (ordered[i][z] && isObject(ordered[i][z])) {
					ordered[i][z] = sort_keys(ordered[i][z]); // sort the inner object
				}
			}

			try {
				ordered[i] = ordered[i].sort(compareStrings);		// sort the array of strings
			} catch (e) {
				ordered[i] = ordered[i].sort();						// sort the array of ?
			}
		}
	}
	return ordered;

	function compareStrings(a: any, b: any) {
		return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
	}

	function isObject(o: any) {
		return o instanceof Object && o.constructor === Object;
	}
}

// --------------------------------------------------------------------------------
// change key's in an object from using underscores to camel case (existing case is preserved where applicable)
// --------------------------------------------------------------------------------
function underscores_2_camelCase(orig: any, _iter: number | null): any {
	if (!_iter) { _iter = 1; }
	if (typeof orig !== 'object') {
		logger.warn('[stitch] underscores_2_camelCase() is expecting an object. not:', orig);
		return null;
	} else if (_iter >= 1000) {
		logger.error('[stitch] too many recursive loops, cannot convert obj:', orig, _iter);
		return null;
	} else {
		const ret: any = {};

		if (Array.isArray(orig)) {				// if its an array, see if array contains objects
			let arr = [];
			for (let i in orig) {															// iter on array contents
				if (typeof orig[i] === 'object') {
					arr.push(underscores_2_camelCase(orig[i], ++_iter));					// recursive
				} else {
					arr.push(orig[i]);
				}
			}
			return arr;
		} else {
			for (let key in orig) {
				const parts = key.split('_');
				const formatted = [];														// ts won't let me overwrite parts
				for (let i in parts) {
					if (Number(i) === 0) {
						formatted.push(parts[i]);											// first word is already good
					} else {
						formatted.push(parts[i][0].toUpperCase() + parts[i].substring(1));	// convert first letter to uppercase
					}
				}

				if (formatted.length === 0) {
					logger.warn('[stitch] underscores_2_camelCase() cannot format key:', parts);
				} else {
					const newKey = formatted.join('');
					if (typeof orig[key] === 'object') {
						ret[newKey] = underscores_2_camelCase(orig[key], ++_iter);			// recursive
					} else {
						ret[newKey] = orig[key];
					}
				}
			}
		}
		return ret;
	}
}

// --------------------------------------------------------------------------------
// change key's in an object from using camel case to underscore (existing case is preserved where applicable)
// --------------------------------------------------------------------------------
function camelCase_2_underscores(orig: any, _iter: number | null) {
	if (!_iter) { _iter = 1; }
	if (typeof orig !== 'object' || Array.isArray(orig) || orig === null) {
		return orig;
	} else if (_iter >= 1000) {
		logger.error('[stitch] too many recursive loops, cannot convert obj:', orig, _iter);
		return null;
	} else {
		const ret: any = {};

		for (let key in orig) {
			let newKey = key;
			const first_letter = key[0];
			if (first_letter === first_letter.toLowerCase()) {						// first letter must be lowercase
				newKey = edit_key(key, 1);
			}

			if (typeof orig[key] === 'object') {
				if (Array.isArray(orig[key])) {
					ret[newKey] = [];												// init
					for (let i in orig[key]) {
						ret[newKey][i] = camelCase_2_underscores(orig[key][i], ++_iter);	// recursive
					}
				} else {
					ret[newKey] = camelCase_2_underscores(orig[key], ++_iter);				// recursive
				}
			} else {
				ret[newKey] = orig[key];
			}
		}
		return ret;
	}

	function edit_key(key: string, _iter_b: number): string {
		const regex_uppercase_letter = new RegExp(/[A-Z]/);
		let new_key = key;
		if (_iter_b >= 100) {
			logger.error('[stitch] too many recursive loops, cannot edit key', key, _iter_b);
			return new_key;
		}

		const matches: any = key.match(regex_uppercase_letter);
		if (matches && matches.index >= 0) {
			const orig_pos = matches.index;
			new_key = key.substring(0, orig_pos) + '_' + key[orig_pos].toLowerCase() + key.substring(orig_pos + 1);
			return edit_key(new_key, ++_iter_b);									// recursive, look for multiple camel case words
		} else {
			return new_key;
		}
	}
}

function friendly_ms(ms: number) {
	let ret = '';
	ms = Number(ms);
	if (isNaN(ms)) { ret = '? sec'; }
	else if (ms <= 0) { ret = '0 secs'; }
	else if (ms > 24 * 60 * 60 * 1000) { ret = (ms / 1000 / 60 / 60 / 24).toFixed(1) + ' days'; }//format for days
	else if (ms > 60 * 60 * 1000) { ret = (ms / 1000 / 60 / 60).toFixed(1) + ' hrs'; }	//format for hours
	else if (ms > 60 * 1000) { ret = (ms / 1000 / 60).toFixed(1) + ' mins'; }			//format for mins
	else if (ms > 1000) { ret = (ms / 1000).toFixed(1) + ' secs'; }						//format for secs
	else { ret = ms.toFixed(1) + ' ms'; }												//format to ms
	return ret;
}

// join two urls together
function url_join(url1: string, url2: string) {
	let ret = url1;
	if (url1[url1.length - 1] === '/') {				// has ending slash
		if (url2[0] === '/') {							// has starting slash
			ret += url2.substring(1);					// skip 1st character
		} else {
			ret += url2;								// include all characters
		}
	} else {											// missing ending slash
		if (url2[0] === '/') {							// has starting slash
			ret += url2;								// include all characters
		} else {
			ret += '/' + url2;
		}
	}
	return ret;
}
