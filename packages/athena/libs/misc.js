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
// misc.js - common/general miscellaneous functions (not OpTool specific)
//------------------------------------------------------------
/* eslint no-bitwise: 0 */

module.exports = function (logger, t) {
	const exports = {};

	//------------------------------------------------------------
	// generate random string of length "size" - slow (4secs/million) [base 63]
	//------------------------------------------------------------
	exports.generateRandomString = function (size) {
		let randomString = '';
		if (!size || size <= 0) {
			size = 32;
		}
		randomString = require('crypto').randomBytes(Math.floor(size * 0.75) + 1).toString('base64');
		randomString = randomString.slice(0, size);
		return randomString.replace(/\+/g, '_').replace(/\//g, '_');	// replace the difficult characters
	};

	//------------------------------------------------------------
	// generate random string of length "size" - fast (1sec/million)
	//------------------------------------------------------------
	exports.simpleRandomString = function (size, use_hex) {
		let ret = '';
		const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
			'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
		const hex_ids = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
		const ids2use = (use_hex === true) ? hex_ids : ids;
		for (let i = 0; i < size; i++) {
			let id = ids2use[Math.floor(Math.random() * ids2use.length) % ids2use.length];
			ret += id;
		}
		return ret;
	};

	//------------------------------------------------------------
	// generate pseudo-unique random string - fast enough (3sec/million)
	//------------------------------------------------------------
	exports.uniqueRandomString = function () {
		let base = Date.now().toString();						// timestamp makes this pretty unique (small window of overlap)
		let ret = '';
		const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
			'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
		for (let i in base) {
			ret += ids[Number(base[i])];
		}
		return exports.simpleRandomString(4) + ret + exports.simpleRandomString(4);		// extra unique ness
	};

	// hash a str [same as Java's string.hashCode()]
	exports.hash_str = function (str) {
		let hash = 0;
		for (const i in str) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return hash;
	};

	//------------------------------------------------------------
	// format timestamp in ms to x.x FRIENDLY_UNITS. ex: 6.4 mins, or 2.0 secs (negative values become 0)
	//------------------------------------------------------------
	exports.friendly_ms = function (ms) {
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
	};

	//------------------------------------------------------------
	// format bytes to x.x FRIENDLY_UNITS. ex: 6.4 GB, or 2.0 MB (negative values become 0)
	//------------------------------------------------------------
	exports.friendly_bytes = function (bytes, digits) {
		let ret = '';
		if (digits === undefined) {
			digits = 2;
		}
		bytes = Number(bytes);
		if (isNaN(bytes)) { ret = '? Bytes'; }
		else if (bytes <= 0) { ret = '0 Bytes'; }
		else if (bytes >= 1024 * 1024 * 1024 * 1024 * 1024) { ret = (bytes / 1024 / 1024 / 1024 / 1024 / 1024 / 1024).toFixed(digits) + ' PiB'; }
		else if (bytes >= 1024 * 1024 * 1024 * 1024) { ret = (bytes / 1024 / 1024 / 1024 / 1024).toFixed(digits) + ' TiB'; }
		else if (bytes >= 1024 * 1024 * 1024) { ret = (bytes / 1024 / 1024 / 1024).toFixed(digits) + ' GiB'; }
		else if (bytes >= 1024 * 1024) { ret = (bytes / 1024 / 1024).toFixed(digits) + ' MiB'; }
		else if (bytes >= 1024) { ret = (bytes / 1024).toFixed(digits) + ' KiB'; }
		else { ret = bytes.toFixed(digits) + ' Bytes'; }
		return ret;
	};

	//------------------------------------------------------------
	// format a large number to x.xx FRIENDLY_UNITS. ex: 1234567 -> '1.23m' (negative values become 0)
	//------------------------------------------------------------
	exports.friendly_number = function (num, dec) {
		let ret = '';
		dec = !isNaN(dec) ? dec : 2;
		num = Number(num);
		if (isNaN(num)) { ret = '?'; }
		else if (num <= 0) { ret = '0'; }
		else if (num > 1000 * 1000 * 1000 * 1000) { ret = (num / 1000 / 1000 / 1000 / 1000).toFixed(dec) + 'T'; }	// format for trillions
		else if (num > 1000 * 1000 * 1000) { ret = (num / 1000 / 1000 / 1000).toFixed(dec) + 'B'; }					// format for billions
		else if (num > 1000 * 1000) { ret = (num / 1000 / 1000).toFixed(dec) + 'M'; }								// format for millions
		else if (num > 1000) { ret = (num / 1000).toFixed(dec) + 'K'; }												// format for thousands
		else { ret = num.toFixed(dec); }																			// format to base
		return ret;
	};

	//------------------------------------------------------------
	// base64 encode a string
	//------------------------------------------------------------
	exports.b64 = function (str) {
		return (Buffer.from(str)).toString('base64');
	};

	//------------------------------------------------------------
	// decode base64 into binary
	//------------------------------------------------------------
	exports.decodeb64Bin = function (data) {
		return (Buffer.from(data, 'base64'));
	};

	//------------------------------------------------------------
	// decode base64 into string
	//------------------------------------------------------------
	exports.decodeb64 = function (b64string) {
		if (!b64string) {
			logger.error('[misc] cannot base 64 decode something that isn\'t there');
			return null;
		}
		return (Buffer.from(b64string, 'base64')).toString();
	};

	//------------------------------------------------------------
	// convert string to binary
	//------------------------------------------------------------
	exports.strToBin = function (str) {
		return new Buffer(str, 'utf8');
	};

	//------------------------------------------------------------
	// convert binary to string
	//------------------------------------------------------------
	exports.binToStr = function (bin) {
		return (Buffer.from(bin, 'binary')).toString();
	};

	//------------------------------------------------------------
	// input a hex encoded string and output a base64 string
	//------------------------------------------------------------
	exports.hexStr2b64 = function (hexString) {
		if (!hexString) {
			logger.error('[misc] cannot base 64 encode something that isn\'t there');
			return null;
		}
		return (Buffer.from(hexString, 'hex')).toString('base64');
	};

	//------------------------------------------------------------
	// format a date from timestamp
	//------------------------------------------------------------
	exports.formatDate = function (date, fmt) {
		date = new Date(date);

		// left pad number with "0" if needed
		function pad(value, desired) {
			let str = value.toString();
			for (let i = str.length; i < desired; i++) {
				str = '0' + str;
			}
			return str;
		}

		return fmt.replace(/%([a-zA-Z])/g, function (_, fmtCode) {
			let tmp;
			switch (fmtCode) {
				case 'Y':
					return date.getUTCFullYear();
				case 'M':								//Month 0 padded
					return pad(date.getUTCMonth() + 1, 2);
				case 'd':								//Date 0 padded
					return pad(date.getUTCDate(), 2);
				case 'H':								//24 Hour 0 padded
					return pad(date.getUTCHours(), 2);
				case 'I':								//12 Hour 0 padded
					tmp = date.getUTCHours();
					if (tmp === 0) { tmp = 12; }		//00:00 should be seen as 12:00am
					else if (tmp > 12) { tmp -= 12; }
					return pad(tmp, 2);
				case 'p':								//am / pm
					tmp = date.getUTCHours();
					if (tmp >= 12) { return 'pm'; }
					return 'am';
				case 'P':								//AM / PM
					tmp = date.getUTCHours();
					if (tmp >= 12) { return 'PM'; }
					return 'AM';
				case 'm':								//Minutes 0 padded
					return pad(date.getUTCMinutes(), 2);
				case 's':								//Seconds 0 padded
					return pad(date.getUTCSeconds(), 2);
				case 'r':								//Milliseconds (3 digits) 0 padded
					return pad(date.getUTCMilliseconds(), 3);
				case 'R':								//Milliseconds (2 digits) 0 padded
					return pad(Math.floor(date.getUTCMilliseconds() / 10), 2);
				case 'q':								//UTC timestamp
					return date.getTime();
				default:
					logger.warn('unsupported fmt for formatDate()', fmt);
					return date.getTime();
			}
		});
	};

	//------------------------------------------------------------
	// Sort object fields and array entries, RECURSIVE! (Order: Symbols, Numbers, Upper Case, Lower Case)
	//------------------------------------------------------------
	exports.sortItOut = function (unsorted, debug) {
		const MAX_DEPTH = 1000;
		if (debug) { console.log('Sorting your', typeof unsorted); }
		try {
			return sortMeDummy(unsorted, 0);
		} catch (e) {
			return unsorted;
		}

		function sortMeDummy(un_sorted, depth) {
			let ordered = {};
			if (!depth) { depth = 0; }										//depth is used for the pretty debug print, and circular detect
			let spacing = ' ';
			for (let i = 0; i < depth; i++) { spacing += '- '; }			//stupid debug pretty print

			if (depth >= MAX_DEPTH) {
				if (debug) { console.log('Error - sorting at max depth. Is the object circular... that no work', MAX_DEPTH); }
				return ordered;												//maximum depth reached
			}
			if (exports.isObject(un_sorted)) {
				Object.keys(un_sorted).sort(compareStrings).forEach(function (key) {
					ordered[key] = un_sorted[key];							//sort all the object's keys
				});
			} else {
				ordered = unsorted.sort(compareStrings);					//sort the array of strings
			}

			for (let i in ordered) {
				if (exports.isObject(ordered[i])) {
					if (debug) { console.log(spacing + 'sorting object:', i); }
					ordered[i] = sortMeDummy(ordered[i], depth + 1);		//sort all the object's object's keys
				} else if (Array.isArray(ordered[i])) {
					if (ordered[i][0] && exports.isObject(ordered[i][0])) {
						if (debug) { console.log(spacing + 'cannot sort array of objects:', i); }	//cannot sort array of objects
						for (let z in ordered[i]) {
							ordered[i][z] = sortMeDummy(ordered[i][z], depth + 1);	//sort the inner object
						}
					} else {
						if (ordered[i][0] && typeof ordered[i][0] !== 'string') {
							if (debug) { console.log(spacing + 'sorting array of numbers:', i); }
							ordered[i].sort(compareNumbers);				//sort the array of numbers
						} else {
							if (debug) { console.log(spacing + 'sorting array of strings:', i); }
							ordered[i].sort(compareStrings);				//sort the array of strings
						}
					}
				}
			}
			return ordered;
		}

		function compareStrings(a, b) {
			return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
		}

		function compareNumbers(a, b) {
			return a - b;
		}
	};

	//------------------------------------------------------------
	// Sort an object's key fields, RECURSIVE! (Order: Symbols, Numbers, Upper Case, Lower Case)
	//------------------------------------------------------------
	exports.sortKeys = function (unsorted, iter, max) {
		let ordered = {};
		iter = iter || 0;
		max = max || 1000;
		if (iter > max) {														// our watch dog
			logger.error('[misc] unable to sort object, too many iterations:', iter);
			return unsorted;
		}

		if (exports.isObject(unsorted)) {
			Object.keys(unsorted).sort(compareStrings).forEach(function (key) {
				ordered[key] = unsorted[key];									// sort all the object's keys
			});
		} else {
			return unsorted;
		}

		for (let i in ordered) {
			if (exports.isObject(ordered[i])) {
				ordered[i] = exports.sortKeys(ordered[i], ++iter, max);				// sort all the object's object's keys
			} else if (Array.isArray(ordered[i])) {
				for (let z in ordered[i]) {
					if (ordered[i][z] && exports.isObject(ordered[i][z])) {
						ordered[i][z] = exports.sortKeys(ordered[i][z], ++iter, max); // sort the inner object
					}
				}
			}
		}
		return ordered;

		function compareStrings(a, b) {
			return a.localeCompare(b, { usage: 'sort', numeric: true, caseFirst: 'upper' });
		}
	};

	//------------------------------------------------------------
	// Bring all keys in object to lowercase - RECURSIVE!
	//------------------------------------------------------------
	exports.lc_object_keys_rec = function (input, deep_copy, iter) {
		let ret = {};
		iter = iter || 0;
		if (iter > 1000) {															// our watch dog
			logger.error('[misc] unable to bring object to lower case, too many iterations:', iter);
			return input;
		}

		if (exports.isObject(input)) {												// first work on the outer object
			ret = exports.lc_object_keys(input, deep_copy);
		} else {
			return input;
		}

		for (let i in ret) {														// now work on nested items
			if (exports.isObject(ret[i])) {
				const lc_key = i.toLowerCase();
				ret[lc_key] = exports.lc_object_keys_rec(ret[i], deep_copy, ++iter);				// bring keys in nested object to lowercase
			} else if (Array.isArray(ret[i])) {
				for (let z in ret[i]) {
					if (ret[i][z] && exports.isObject(ret[i][z])) {
						const lc_key = z.toLowerCase();
						ret[i][lc_key] = exports.lc_object_keys_rec(ret[i][z], deep_copy, ++iter); // bring keys in array w/object to lowercase
					}
				}
			}
		}
		return ret;
	};

	//------------------------------------------------------------
	// Bring keys in outer object to lowercase - (can use deep copy or not on objects)
	//------------------------------------------------------------
	exports.lc_object_keys = function (input, deep_copy) {
		if (!exports.isObject(input)) {
			return null;
		} else {
			let ret = {};
			for (let key in input) {
				const lc_key = key.toLowerCase();
				if (deep_copy === true && typeof input[key] === 'object') {
					ret[lc_key] = JSON.parse(JSON.stringify(input[key]));
				} else {
					ret[lc_key] = input[key];			// sometimes we don't want a copy
				}
			}
			return ret;
		}
	};

	//------------------------------------------------------------
	// Is the thing an object (not an array/string/etc)
	//------------------------------------------------------------
	exports.isObject = function (o) {
		return o instanceof Object && o.constructor === Object;
	};

	// encrypt a string
	exports.encrypt = function (text, password) {
		let crypt = null;
		try {
			const cipher = t.crypto.createCipher('aes-256-ctr', password);
			crypt = cipher.update(text, 'utf8', 'hex');
			crypt += cipher.final('hex');
		} catch (e) {
			logger.error('Could not encrypt text', e);
		}
		return crypt;
	};

	// decrypt a string
	exports.decrypt = function (text, password) {
		let dec = null;
		try {
			const decipher = t.crypto.createDecipher('aes-256-ctr', password);
			dec = decipher.update(text, 'hex', 'utf8');
			dec += decipher.final('utf8');
		} catch (e) {
			logger.error('Could not decrypt text', e);
		}
		return dec;
	};

	// remove an entire directory
	exports.rmdir = function (dir_path) {
		if (t.fs.existsSync(dir_path)) {
			t.fs.readdirSync(dir_path).forEach(function (entry) {
				const entry_path = t.path.join(dir_path, entry);
				if (t.fs.lstatSync(entry_path).isDirectory()) {
					exports.rmdir(entry_path);
				}
				else {
					t.fs.unlinkSync(entry_path);
				}
			});
			t.fs.rmdirSync(dir_path);
		}
	};

	// copy an entire directory
	exports.copy_dir_sync = function (old_dir_path, new_dir_path) {
		if (t.fs.existsSync(old_dir_path)) {
			if (t.fs.lstatSync(old_dir_path).isDirectory()) {

				//console.log('copying folder. from: ' + old_dir_path + ', to: ' + new_dir_path);
				if (!t.fs.existsSync(new_dir_path)) {								// make new dir
					t.fs.mkdirSync(new_dir_path);
				}

				t.fs.readdirSync(old_dir_path).forEach(function (entry) {
					const old_entry_path = t.path.join(old_dir_path, entry);
					const new_entry_path = t.path.join(new_dir_path, entry);
					if (t.fs.lstatSync(old_entry_path).isDirectory()) {
						exports.copy_dir_sync(old_entry_path, new_entry_path);
					} else {													// copy new file
						//console.log('  copying file from: ' + old_entry_path + ', to: ' + new_entry_path);
						const data = t.fs.readFileSync(old_entry_path);
						t.fs.writeFileSync(new_entry_path, data);
					}
				});
			} else {
				logger.error('path is not a directory', old_dir_path);
			}
		} else {
			logger.error('path does not exist', old_dir_path);
		}
	};

	// move an entire directory
	exports.move_dir = function (old_dir_path, new_dir_path) {
		exports.copy_dir_sync(old_dir_path, new_dir_path);
		exports.rmdir(old_dir_path);									// remove old dir
	};

	// check if the path to a file exists, create it if needed
	/*
	opts: {
		file_path: '/something/here/to/do.jpg',
		create: true
	}
	*/
	exports.check_dir_sync = function (opts) {
		let folders = opts.file_path.replace(/\\/g, '//').split('/');	// replace window's path delimiters
		folders.splice(folders.length - 1, 1);							// remove the file at the end of path
		let path = '';
		for (let i in folders) {										// walk the path and make each folder to it
			path += folders[i] + '/';
			if (!t.fs.existsSync(path)) {
				if (opts.create === true) {
					t.fs.mkdirSync(path);
				} else {
					return false;
				}
			}
		}
		return true;
	};

	//------------------------------------------------------------
	/* Watch dog function - calls callback via the logic function, OR if time ran out. only calls callback once.
		opts: {
			timeout_ms: 0,
			description: 'enrolling',			// used to create the error message
		},
		logic: function(){},
	*/
	//------------------------------------------------------------
	exports.watch_this = (opts, logic, cb) => {
		let called_cb = false;

		// --- Setup Watch dog --- //
		const watch_dog = setTimeout(() => {
			if (called_cb) {
				// Nothing happens if this condition evaluates to true - this is intentional
			} else {
				called_cb = true;
				if (cb) {
					return cb({ parsed: 'timeout when ' + opts.description });
				}
			}
		}, opts.timeout_ms);

		// perform our logic call
		logic((e, resp) => {
			if (called_cb) {
				// Nothing happens if this condition evaluates to true - this is intentional
			} else {
				called_cb = true;
				clearTimeout(watch_dog);
				if (cb) {
					return cb(e, resp);
				}
			}
		});
	};

	// merge an array of input error strings with the validate properties object
	exports.merge_other_input_errors = (errorObj, other_errors_array) => {
		if (Array.isArray(other_errors_array) && other_errors_array.length > 0) {	// if there are errors...
			if (!errorObj) {														// init chris' error object
				errorObj = {
					statusCode: null,
					errs: null,
				};
			}
			if (!Array.isArray(errorObj.errs)) {									// init the err string array
				errorObj.errs = [];
			}
			errorObj.statusCode = 400;												// if there was an existing code, so be it, overwrite
			errorObj.errs = errorObj.errs.concat(other_errors_array);				// add new errors w/existing errors
		}
		return errorObj;
	};

	//------------------------------------------------------------
	// Base64 encode a PEM file
	//------------------------------------------------------------
	exports.formatPEM = function (pem) {
		if (pem) {
			if (pem.indexOf('\r\n') === -1) {
				pem = pem.replace(/\n/g, '\r\n');					// replace \n with \r\n
			}
			pem = ensure_newline(pem);
			pem = exports.b64(pem);
		}

		function ensure_newline(str) {
			if (str && str.lastIndexOf('\n') !== -1 && str.length > 0) {
				if (str.lastIndexOf('\n') !== str.length - 1) {		// append a new line to eof if there is not one
					str += '\r\n';
				}
			}
			return str;
		}

		return pem;
	};

	//-------------------------------------------------------------
	// Formats an object full of strings/numbers/booleans into a http query format
	//-------------------------------------------------------------
	exports.formatObjAsQueryParams = (obj) => {
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
		return query;
	};

	//-------------------------------------------------------------
	// get the original ibm id's email with asterisks
	//-------------------------------------------------------------
	exports.censorEmail = function (email) {
		if (email && email.indexOf) {
			const pos = email.indexOf('@');
			if (pos >= 0) {
				let left = email.substring(0, pos);
				if (left.length <= 1) {
					return '*' + email.substring(pos);					// short emails get blanked out completely
				} if (left.length <= 2) {
					return '**' + email.substring(pos);					// short emails get blanked out completely
				} else if (left.length <= 3) {
					return email[0] + '**' + email.substring(pos);		// shortish emails keep their first letter
				} else {
					let asterisks = '';									// normal emails keep first and last letter left of '@'
					for (let i = 0; i < left.length - 2; i++) { asterisks += '*'; }
					return email[0] + asterisks + email[pos - 1] + email.substring(pos);
				}
			} else {
				if (email.length > 8) {									// api keys get limited to 8 and fixed length
					return email.substring(0, 8) + '***';
				} else {
					return email;
				}
			}
		}
		return 'unknown_email';
	};

	//-------------------------------------------------------------
	// get the enroll ID from a 64 bit PEM encoded certificate
	//-------------------------------------------------------------
	exports.getEnrollIdFromCert = (certificate) => {
		try {
			const decoded_cert = exports.decodeb64(certificate);
			const x = new t.js_rsa.X509();
			x.readCertPEM(decoded_cert);
			const sub = x.getSubjectString();
			const pos = sub.lastIndexOf('CN=');
			if (pos > 0) {
				return sub.substring(pos + 3);
			}
		} catch (e) { }
		return null;
	};

	// ------------------------------------------
	// return the hostname from a url
	// ------------------------------------------
	exports.get_host = function (url) {
		const parts = exports.break_up_url(url);
		if (!parts) {
			return null;					// error is logged elsewhere
		} else {
			return parts.hostname;
		}
	};

	// ------------------------------------------
	// break up url in proto, basic auth, hostname, port, etc
	// ------------------------------------------
	exports.break_up_url = function (url) {
		if (url && typeof url === 'string' && !url.includes('://')) {			// if no protocol, assume https
			url = 'https://' + url;												// append https so we can parse it
		}

		const parts = typeof url === 'string' ? t.url.parse(url) : null;
		if (!parts || !parts.hostname) {
			logger.error('cannot parse url:', encodeURI(url));
			return null;
		} else {
			const protocol = parts.protocol ? parts.protocol : 'https:';		// default protocol is https
			if (parts.port === null) {
				parts.port = protocol === 'https:' ? '443' : '80';				// match default ports to protocol
			}
			parts.auth_str = parts.auth ? parts.auth + '@' : '';				// defaults to no auth

			return parts;
		}
	};

	// ------------------------------------------
	// parse url return proto + :basic_auth? + hostname + port
	// ------------------------------------------
	exports.format_url = function (url) {
		const parts = exports.break_up_url(url);
		if (!parts || !parts.hostname) {
			return null;					// error is logged elsewhere
		} else {
			return parts.protocol + '//' + parts.auth_str + parts.hostname + ':' + parts.port;
		}
	};

	// ------------------------------------------
	// redact basic auth in url
	// ------------------------------------------
	exports.redact_basic_auth = function (url) {
		const parts = exports.break_up_url(url);
		if (!parts || !parts.hostname) {
			return null;				// error is logged elsewhere
		} else {
			return parts.protocol + '//' + parts.hostname + ':' + parts.port;
		}
	};

	// ------------------------------------------
	// parse query parameter as array of strings
	// ------------------------------------------
	exports.fmt_arr_of_strings_query_param = function (req, field_name) {
		let ret = null;
		if (field_name && req && req.query && req.query[field_name]) {
			try {
				ret = [];
				req.query[field_name] = req.query[field_name].replace(/'/g, '"');	// allow user to input single quotes, double quotes preferred
				if (req.query[field_name]) {
					ret = JSON.parse(decodeURIComponent(req.query[field_name]));
				}
			} catch (e) {
				logger.error('[misc] unable to parse query param', field_name, e);
				ret = null;
			}
		}
		return ret;
	};

	// ------------------------------------------
	// compares if JSON has differences or not
	// ------------------------------------------
	exports.is_equal = function (a, b) {
		return !exports.is_different(a, b);
	};

	// -----------------------------------------------------
	// compares if a is different than b (any data type)
	// -----------------------------------------------------
	exports.is_different = (a, b) => {
		try {
			try {
				a = JSON.parse(JSON.stringify(a));		// deep copy to break references, prevents weird errors if a and b have refs to the same fields
				b = JSON.parse(JSON.stringify(b));
			} catch (e) { }
			const a_temp = (typeof a === 'object') ? exports.sortKeys(a) : a;	// sort objects before compare
			const b_temp = (typeof b === 'object') ? exports.sortKeys(b) : b;	// sort objects before compare
			return JSON.stringify(a_temp) !== JSON.stringify(b_temp);
		} catch (e) {
			logger.error('[misc] error when comparing fields', e);
			return true;
		}
	};

	// ------------------------------------------
	// compares if design docs are the same or not
	// ------------------------------------------
	exports.are_design_docs_equal = function (a, b) {
		if (a && b) {
			const a_clone = JSON.parse(JSON.stringify(a));
			const b_clone = JSON.parse(JSON.stringify(b));
			delete a_clone._rev;
			delete b_clone._rev;
			return exports.is_equal(a_clone, b_clone);
		}
		return false;
	};

	// ------------------------------------------
	// salt a secret
	// ------------------------------------------
	exports.sha512 = function (secret, salt) {
		const hash = t.crypto.createHmac('sha512', salt);
		hash.update(secret);
		return {
			salt: salt,
			hashed_secret: hash.digest('hex')
		};
	};
	exports.salt_secret = function (secret) {
		return exports.sha512(secret, exports.generateRandomString(32));
	};

	// ------------------------------------------
	// verify secret - returns true if matches hash
	// ------------------------------------------
	exports.verify_secret = function (input_secret, known_salt, known_hash) {
		if (!known_hash || !input_secret) {				// required inputs
			logger.error('cannot verify secret, missing hash or input. hash:', known_hash);
			return false;
		} else {
			const calc_salt_details = exports.sha512(input_secret, known_salt);
			return calc_salt_details ? (calc_salt_details.hashed_secret === known_hash) : false;
		}
	};

	// ------------------------------------------
	// attempt to navigate the object with a path(string). if anything goes wrong return null.
	// - "paths" can be an array of strings, or a string.
	// ------------------------------------------
	exports.safe_dot_nav = function (obj, paths) {
		paths = JSON.parse(JSON.stringify(paths));
		let path = Array.isArray(paths) ? paths[0] : paths;		// if its not an array, hopefully its a string
		let prev = null;

		if (typeof obj === 'undefined') {
			return null;
		}

		try {
			prev = JSON.parse(JSON.stringify(obj));
		} catch (e) {
			logger.error('[safe dot nav] cannot clone object, will be unable to navigate it', paths, e);
			return null;
		}

		try {
			if (typeof path === 'string') {
				const parts = path.split('.');

				if (parts && parts.length >= 0) {
					for (let i = 1; i < parts.length; i++) {	// skip the first key (ie start at 1)
						prev = prev[parts[i]];
					}
					if (typeof prev !== 'undefined') {
						return prev;							// found it, return
					}
				}
			}
		} catch (e) { }

		if (!Array.isArray(paths)) {							// see if there are other paths to try
			return null;
		} else {
			paths.shift();										// remove 0
			if (paths.length === 0) {
				return null;
			} else {
				return exports.safe_dot_nav(obj, paths);		// well that didn't work, try the next path
			}
		}
	};

	// ---------------------------------------------
	// returns true if passed value contains spaces
	// ---------------------------------------------
	exports.contains_spaces = (value) => {
		if (typeof value === 'string') {
			const hasSpaces = /\s/;
			return hasSpaces.test(value);
		}
		return { statusCode: 400, msg: 'passed value was not a string' };
	};

	// ---------------------------------------------
	// return true if is array with at least 1 member
	// ---------------------------------------------
	exports.is_populated_array = function (thing) {
		return thing && Array.isArray(thing) && thing.length > 0;
	};

	// ---------------------------------------------
	// return input as array unless its falsy, if already an array return as is
	// ---------------------------------------------
	exports.forced_array = function (input) {
		if (Array.isArray(input)) {
			return input;
		} else if (input) {
			return [input];
		} else {
			return undefined;
		}
	};

	// ------------------------------------------------------------
	// wrapper on request module - does retries on some error codes
	// -------------------------------------------------------------
	/*
		options: {
			// normal request options go here
			baseUrl: '',

			... //etc

			// req name to print in logs
			// defaults to 'request'
			_name: 'component lib',

			// maximum number of requests to send
			// defaults to 3
			_max_attempts: 3,

			// object of codes that should be retried.
			// if a code occurs that is not in this object it will not be retired. its error will be returned.
			// defaults to 429, 408, & 500 codes.
			_retry_codes: { '408' : 'description of code'},

			// if provided will use this function to calculate the delay between this failure and the next retry, ms
			_calc_retry_delay: (options, resp) => {
				return (1000 * options._attempt + (Math.random() * 2000)).toFixed(0);
			},

			// if provided will use this function to calculate the timeout of the next retry, ms
			_calc_retry_timeout: (options, resp) => {
				return Number(options.timeout) + 10000 * (options._attempt + 1);
			}
		}

	*/
	exports.retry_req = (options, cb) => {
		options._name = options._name || 'request';										// name for request type, for debugging
		options._max_attempts = options._max_attempts || 3;								// only try so many times
		options._retry_codes = options._retry_codes || {								// list of codes we will retry
			'429': '429 rate limit exceeded aka too many reqs',
			'408': '408 timeout',
			'500': '500 internal error',
		};
		options._tx_id = options._tx_id || exports.simpleRandomString(3).toLowerCase();	// make a tx id for logs, for debugging
		if (!options._attempt) { options._attempt = 0; }								// keep track of attempts
		options._attempt++;

		if (options.baseUrl) { options.baseUrl = encodeURI(options.baseUrl); }			// pen test require the encodeURI usage here
		if (options.url) { options.url = encodeURI(options.url); }						// pen test require the encodeURI usage here
		if (options.uri) { options.url = encodeURI(options.uri); }

		// --- Send the Request --- //
		const redacted_url = exports.redact_basic_auth(options.baseUrl ? (options.baseUrl + options.url) : options.url);
		logger.debug('[' + options._name + ' ' + options._tx_id + '] sending ' + options.method + ' outgoing-req-timeout:',
			exports.friendly_ms(options.timeout), 'url:', redacted_url, options._attempt);
		t.request(options, (req_e, resp) => {
			if (req_e) {																// detect timeout request error
				logger.error('[' + options._name + ' ' + options._tx_id + '] unable to reach destination. error:', req_e);
				resp = resp ? resp : {};												// init if not already present
				resp.statusCode = resp.statusCode ? resp.statusCode : 500;				// init code if empty
				resp.body = resp.body ? resp.body : req_e;								// copy requests error to resp if its empty
				if (req_e.toString().indexOf('TIMEDOUT') >= 0) {
					logger.error('[' + options._name + ' ' + options._tx_id + '] timeout exceeded:', options.timeout);
					resp.statusCode = 408;
				}
			}

			const code = t.ot_misc.get_code(resp);
			if (t.ot_misc.is_error_code(code)) {
				logger.warn('[' + options._name + ' ' + options._tx_id + '] status code:', code);
				const code_desc = options._retry_codes[code.toString()];
				if (code_desc) {														// retry on these error codes
					if (options._attempt >= options._max_attempts) {
						logger.warn('[' + options._name + ' ' + options._tx_id + '] ' + code_desc + ', giving up. attempts:', options._attempt);
						return cb(req_e, resp);
					} else {
						let delay_ms = calc_delay(options, resp);
						logger.warn('[' + options._name + ' ' + options._tx_id + '] ' + code_desc + ', trying again in a bit:', exports.friendly_ms(delay_ms));
						return setTimeout(() => {
							options.timeout = calc_retry_timeout(options, resp);
							logger.warn('[' + options._name + ' ' + options._tx_id + '] sending retry for prev ' + code + ' error.', options._attempt);
							return exports.retry_req(options, cb);
						}, delay_ms);
					}
				}
			}
			return cb(req_e, resp);															// return final error or success
		});

		// calculate the delay to send the next request (in ms) - (_attempt is the number of the attempt that failed)
		function calc_delay(options, resp) {
			if (typeof options._calc_retry_delay === 'function') {
				const delay = options._calc_retry_delay(options, resp);						// if function is provided, call it
				if (delay && !isNaN(delay)) {
					return Number(delay).toFixed(0);
				}
			}

			const code = t.ot_misc.get_code(resp);
			let delay_ms = (50 + Math.random() * 200);										// small delay, little randomness to stagger reqs
			if (code === 429) {																// on 429 codes stager delay w/large randomness
				delay_ms = ((100 * options._attempt) + Math.random() * 1000);
			}
			if (code === 500) {																// on 500 codes stager delay w/large randomness
				delay_ms = ((500 * options._attempt) + Math.random() * 1500);
			}
			return delay_ms.toFixed(0);
		}

		// calculate the timeout for the next request (in ms) - (_attempt is the number of the attempt that failed)
		function calc_retry_timeout(options, resp) {
			if (typeof options._calc_retry_timeout === 'function') {
				const timeout = options._calc_retry_timeout(options, resp);				// if function is provided, call it
				if (timeout && !isNaN(timeout)) {
					return timeout;
				}
			}

			const code = t.ot_misc.get_code(resp);
			if (!options.timeout || isNaN(options.timeout)) {
				options.timeout = 30000;													// default
			}
			if (code === 408) {
				options.timeout = Number(options.timeout) + 10000 * (options._attempt + 1);	// increase each time
			}
			return options.timeout;
		}
	};

	// -----------------------------------------------------
	// A bunch of functions validating the units of things like bytes, cores, duration
	// -----------------------------------------------------

	// returns true if its an invalid core/cpu value ('1m' -> false, '1dog' -> true)
	exports.invalid_cpu_value = (cpu_input, max, min) => {
		max = max || 1000;
		min = min || 0.001;
		let cpu = exports.normalize_cpu(cpu_input);
		if (cpu === null || cpu > max || cpu < min) {
			return true;
		} else {
			return false;
		}
	};

	// returns true if its an invalid bytes value ('1MB' -> false, '1dog' -> true)
	exports.invalid_bytes_value = (memory_input, max, min) => {
		max = max || 1024 * 1024 * 1024 * 1024 * 1024;	// 1 PiB
		min = min || 1;
		let bytes = exports.normalize_bytes(memory_input);
		if (bytes === null || bytes > max || bytes < min) {
			return true;
		} else {
			return false;
		}
	};

	// returns true if its an invalid duration time - ('1s' -> false, '1dog' -> true)
	exports.invalid_duration_value = (time_str, max, min) => {
		max = max || Number.MAX_VALUE;
		min = min || 0;
		let ns = exports.normalize_duration(time_str);
		if (ns === null || ns > max || ns < min) {
			return true;
		} else {
			return false;
		}
	};

	// convert cpu string w/units to number (cores)
	exports.normalize_cpu = (cpu_input) => {
		const units = {
			'n': 1 / 1000 / 1000 / 1000,		// input is using nano cpu
			'u': 1 / 1000 / 1000,				// input is using micro cpu
			'm': 1 / 1000,						// input is using milli cpu
			'nanoCPU': 1 / 1000 / 1000 / 1000,
			'microCPU': 1 / 1000 / 1000,
			'milliCPU': 1 / 1000,
			'CPU': 1,
			'---': 1							// no units in input
		};
		let cpus = normalize_something(units, 'cpu', cpu_input);
		if (cpus === null) {
			return null;
		} else {
			if (cpus > 0.001 || cpus === 0) {
				return Number(cpus.toFixed(3));
			} else if (cpus > 0.000001) {
				return Number(cpus.toFixed(6));
			} else if (cpus > 0.000000001) {
				return Number(cpus.toFixed(9));
			} else {
				return cpus;
			}
		}
	};

	// convert bytes string w/units to number (bytes)
	exports.normalize_bytes = (memory_input, quiet) => {
		const units = {
			'Ti': 1024 * 1024 * 1024 * 1024,	// input is using base2 TB
			'Gi': 1024 * 1024 * 1024,			// input is using base2 GB
			'Mi': 1024 * 1024,					// input is using base2 MB
			'Ki': 1024,							// input is using base2 KB
			'TB': 1000 * 1000 * 1000 * 1000,
			'GB': 1000 * 1000 * 1000,
			'MB': 1000 * 1000,
			'KB': 1000,
			'TiB': 1024 * 1024 * 1024 * 1024,
			'GiB': 1024 * 1024 * 1024,
			'MiB': 1024 * 1024,
			'KiB': 1024,
			'T': 1000 * 1000 * 1000 * 1000,
			'G': 1000 * 1000 * 1000,
			'M': 1000 * 1000,
			'K': 1000,
			'B': 1,								// must be last! (b/c it matches partially on other units)
			'---': 1							// no units in input
		};
		let bytes = normalize_something(units, 'bytes', memory_input, quiet);
		if (bytes === null) {
			return null;
		} else {
			return Number(Math.ceil(bytes));
		}
	};

	// converts multi unit duration str w/units to number (nanoseconds). valid units defined here: https://golang.org/pkg/time/#ParseDuration
	exports.normalize_duration = (time_input_str) => {			// break something like 1.1h20ms3ns into '1.1h', '20ms', '3ns'
		const parts = (typeof time_input_str === 'string') ? time_input_str.match(/(-?\d+\.*\d*\D+)/g) : null;
		if (!parts || parts.length === 0) {						// no units
			return null;
		}

		let ns = 0;
		for (let i in parts) {
			const temp = exports.normalize_time(parts[i]);
			if (temp === null) {								// if we couldn't parse this part's units, give up
				return null;
			}
			ns += temp;
		}
		return Number(Math.ceil(ns));
	};

	// converts a single unit duration str w/units to number (nanoseconds). valid units defined here: https://golang.org/pkg/time/#ParseDuration
	exports.normalize_time = (time_input_str) => {
		const units = {
			'h': 1 * 1000 * 1000 * 1000 * 60 * 60,			// hours
			'm': 1 * 1000 * 1000 * 1000 * 60,				// minutes
			'ms': 1 * 1000 * 1000,							// milliseconds
			'µs': 1 * 1000,									// microseconds
			'us': 1 * 1000,									// microseconds
			'ns': 1,										// nanoseconds
			's': 1 * 1000 * 1000 * 1000,					// seconds - must be last! (b/c it matches partially on other units)
			//'---': 1										// no units in input is invalid for duration
		};
		let ns = normalize_something(units, 'ns', time_input_str);
		if (ns === null) {
			return null;
		} else {
			return Number(Math.ceil(ns));
		}
	};

	// take a map of units and normalize it to the base unit
	function normalize_something(units_map, label, input, quiet) {
		let using_unit = '---';								// the "no units" units, needs to be something the user won't type
		let using_value = Number(input);
		const regex_ws = new RegExp(/[\s]/g);

		if (typeof input === 'string') {
			input = input.replace(regex_ws, '');			// replace/remove any white space

			for (let a_unit in units_map) {
				const pos = input.indexOf(a_unit);
				if (pos > 0 && pos === input.length - a_unit.length) {	// if the unit's string is found at the very end of the input
					using_unit = a_unit;
					using_value = Number(input.substring(0, pos));
					break;
				}
			}
		}

		if (!units_map[using_unit]) {
			if (!quiet) { logger.warn('[misc] input has unknown units for ' + label + '.', exports.safe_str(using_unit)); }
			return null;
		} else if (isNaN(using_value) || typeof input === 'boolean' || typeof input === 'object') {
			if (!quiet) { logger.warn('[misc] input has invalid value for ' + label + '.', exports.safe_str(input)); }
			return null;
		} else if (using_value >= Number.MAX_VALUE || (using_value * units_map[using_unit]) >= Number.MAX_VALUE) {
			if (!quiet) { logger.warn('[misc] input too damn high value for ' + label + '.', exports.safe_str(input)); }
			return null;
		} else {
			return using_value * units_map[using_unit];
		}
	}

	// ------------------------------------------
	// find all valid byte values and convert to base 2 w/no big B units
	// (kubernetes does not support units like [KiB, MiB, GiB, TiB] only [Ki, Mi, Gi, Ti] & [K, M, G, T])
	// ------------------------------------------
	exports.conform_bytes = (orig) => {
		try {
			return walk_obj(orig, 0);
		} catch (e) {
			return orig;
		}

		// recursive - walk an object looking for valid byte values
		function walk_obj(thing, depth) {
			if (depth > 1000) {
				logger.error('[fmt] object too big, will not conform bytes', depth);
				return thing;
			}

			if (thing === null) {
				return thing;
			} else if (typeof thing === 'object') {						// arrays or objects will be walked
				depth++;
				for (let i in thing) {
					thing[i] = walk_obj(thing[i], depth);				// recursive, go deeper
				}
			} else if (typeof thing === 'string') {
				if (exports.normalize_bytes(thing, true)) {					// if its a valid byte input...
					return thing.replace(/\s/, '').replace('iB', 'i');	// remove spaces and remove big B if found
				}
			}

			return thing;
		}
	};

	// -----------------------------------------------------
	// make a string that is safe to log (str came from user input)
	// -----------------------------------------------------
	exports.safe_str = (input) => {
		const regex_id = new RegExp(/[^a-zA-Z0-9-_*!@$%&()\s]/g);		// this might be overly restrictive but its a place to start
		try {
			if (typeof input === 'string') {
				return input.replace(regex_id, '').trim().substring(0, 32);		// remove scary letters and limit length
			}
		} catch (e) { }
		return '[-string redacted-]';
	};

	// -----------------------------------------------------
	// make a jwt safe string that is safe to log (base 64 characters, underscores, dots, dashes)
	// -----------------------------------------------------
	exports.safe_jwt_str = (input) => {
		if (typeof input === 'string') {
			const regex_str = new RegExp(/[^a-zA-Z0-9+/=_.-]/g);
			return input.replace(regex_str, '');					// remove scary letters
		}
		return '';
	};

	// -----------------------------------------------------
	// make a username safe string that is safe to log (invalid characters :<>)
	// -----------------------------------------------------
	exports.safe_username_str = (input) => {
		if (typeof input === 'string') {
			const regex_str = new RegExp(/[:<>'`]/g);
			return input.replace(regex_str, '');					// remove scary letters
		}
		return '';
	};

	// -----------------------------------------------------
	// make a string that is safe to log (str came from user input)
	// -----------------------------------------------------
	exports.safe_url = (input) => {
		if (typeof input === 'string') {
			const regex_str = new RegExp(/[<>'`()\s]/g);
			return input.replace(regex_str, '');					// remove scary letters
		}
		return '';
	};

	// -----------------------------------------------------
	// decide if version b is higher than version a - example: B=0.2.3, A=0.1.9 would return true
	// -----------------------------------------------------
	exports.is_version_b_greater_than_a = (version_a, version_b) => {
		let version_parts_a = version_a ? version_a.trim().replace(/-/g, '.').split('.') : null;		// treat 0.2.4-1 like 0.2.4.1
		let version_parts_b = version_b ? version_b.trim().replace(/-/g, '.').split('.') : null;

		if (version_parts_a === null || version_parts_b == null) {
			return null;
		}

		for (let i in version_parts_a) {
			if (version_parts_b[i] > version_parts_a[i]) {
				return true;
			} else if (version_parts_b[i] === version_parts_a[i]) {
				// equal numbers at this level... keep going
			} else {
				break;
			}
		}
		return false;
	};

	// -----------------------------------------------------
	// return the highest version from an array of versions
	// -----------------------------------------------------
	exports.get_highest_version = (list) => {
		let max = null;
		for (let i in list) {
			if (typeof list[i] === 'string') {
				if (max === null) {			// nothing to compare yet, first one is the highest so far
					max = list[i];
				} else {
					if (exports.is_version_b_greater_than_a(max, list[i])) {
						max = list[i];		// this one is higher, store it
					}
				}
			}
		}
		return max;
	};

	// -----------------------------------------------------------------
	// return true if the certificate provided was signed by a provided root cert
	/* opts: {
			certificate_b64: "<base 64 pem format>",		// [required]
			root_certs_b64: ["<base 64 pem format>"],		// [required]
			debug_tag: "msp_id: org1"						// [required] - cosmetic str, printed in logs
	}*/
	// -----------------------------------------------------------------
	exports.is_trusted_certificate = (opts) => {
		for (let i in opts.root_certs_b64) {
			const certificate_pem = t.misc.decodeb64(opts.certificate_b64);
			const root_cert = t.misc.decodeb64(opts.root_certs_b64[i]);
			let individual_certs = root_cert.split('-----END CERTIFICATE-----');	// break up a cert chain

			if (!t.misc.is_populated_array(individual_certs) || individual_certs.length <= 1) {	// the split makes 1 empty element, so we need 2
				logger.warn('[trusted cert] root cert in position ', i, 'is malformed or empty for', opts.debug_tag);
			} else {
				individual_certs.splice(individual_certs.length - 1, 1);			// remove last one, its empty

				// --- loop on inner certs --- //
				for (let inner in individual_certs) {
					const debug = i + '-' + inner;
					try {
						const single_root_cert = individual_certs[inner] + '-----END CERTIFICATE-----';	// undo the .split() damage
						const pubKey = t.KEYUTIL.getKey(single_root_cert); 			// get the root certificate's public key from inside the cert
						const x = new t.js_rsa.X509();
						x.readCertPEM(certificate_pem);								// load the cert in question, a ca signature should be inside
						const valid = x.verifySignature(pubKey);					// check if the root certificate's public key signed this cert or not
						if (valid) {
							logger.info('[trusted cert]', opts.debug_tag, 'certificate validated with a root cert.', debug);
							return true;											// we only need one to pass, return
						}
					} catch (e) {
						logger.warn('[trusted cert] thrown error when checking certificate', opts.debug_tag, debug, e);
						// don't worry about errors, on to the next cert
					}
				}
			}
		}
		return false;
	};

	// -----------------------------------------------------
	// remove gibberish out of req.ip
	// -----------------------------------------------------
	exports.format_ip = (ip, hash) => {
		if (Array.isArray(ip)) {
			ip = ip[ip.length - 1];						// if its an array, grab the last one
		}

		if (ip && typeof ip === 'string') {
			const matches = ip.match(/\d+\.\d+\.\d+\.\d+/);	// ip format
			if (matches && matches[0]) {
				ip = matches[0];						// ip address has some gibberish on it sometimes
			}
		}

		ip = (!ip || ip === '::1' || ip === '127.0.0.1') ? 'localhost' : ip;

		if (hash === true && ip !== 'localhost') {		// let localhost return un-hashed
			return (Math.floor(Math.abs(t.misc.hash_str(ip) % 1000000))).toString(16);
		} else {
			return ip;
		}
	};

	// -----------------------------------------------------
	// join partial urls -> ['/api/v2/', '/signature/'] => '/api/v2/signature' [DOES NOT WORK IF PROTOCOL IS PRESENT]
	// -----------------------------------------------------
	exports.url_join = (arr_urls) => {
		let ret = '';
		if (!Array.isArray(arr_urls)) {
			logger.warn('[misc] improper use of url_join(), must be array', arr_urls);
			return arr_urls;
		} else {
			ret = arr_urls.join('/');							// concat strings together first, fix duplicate slashes next
			return sanitize(ret);
		}

		function sanitize(str) {
			let sane = '';
			const parts = str.split('/');
			for (let i in parts) {
				if (Number(i) === 0 && parts[i] === '') {		// only the first level can be empty
					sane += '/';
				} else if (parts[i]) {							// 2nd+ positions must contain something
					sane += parts[i] + '/';
				}
			}
			return sane.substring(0, sane.length - 1);			// remove trailing slash
		}
	};

	// -----------------------------------------------------
	// object is null or has no keys (empty)
	// -----------------------------------------------------
	exports.empty_obj = (obj) => {
		if (!obj) {
			return true;
		} else {
			const keys = Object.keys(obj);
			if (keys === 0) {
				return true;
			} else {
				return false;
			}
		}
	};

	// -----------------------------------------------------
	// return true if the cert is expired or near expiration, if we cannot parse the cert return -1
	// -----------------------------------------------------
	exports.cert_is_near_expiration = (cert, near_ms, log_entry) => {
		const parsed_cert = cert ? t.ot_misc.parseCertificate(cert) : null;
		if (!parsed_cert) {
			if (log_entry) { logger.warn('[misc cert] certificate is not parsable:', log_entry); }
			return -1;
		} else {
			const time_left_ms = parsed_cert.not_after_ts ? (parsed_cert.not_after_ts - Date.now()) : 0;
			const log_cn = parsed_cert.subject_parts && parsed_cert.subject_parts.CN ? ('CN: ' + parsed_cert.subject_parts.CN) : '';
			near_ms = near_ms || 0;				// init to 0 if not set
			if (log_entry) {
				// if its negative, print it as negative
				const log_time_left = (time_left_ms >= 0) ? exports.friendly_ms(time_left_ms) : ('-' + exports.friendly_ms(time_left_ms * -1));
				logger.debug('[misc cert] time left on certificate:', log_entry, log_cn, log_time_left);
			}
			if (time_left_ms <= near_ms) {
				return true;
			} else {
				return false;
			}
		}
	};

	return exports;
};
