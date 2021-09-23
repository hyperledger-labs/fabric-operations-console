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
export function getFromStorage(key) {
	if (!key) {
		return null;
	}

	try {
		const valueStr = localStorage.getItem(key);
		if (valueStr) {
			return JSON.parse(valueStr);
		}
		return null;
	} catch (err) {
		return null;
	}
}

export function setInStorage(key, obj) {
	if (!key) {
		console.error('Error: Key is missing');
	}

	try {
		localStorage.setItem(key, JSON.stringify(obj));
	} catch (err) {
		console.error(err);
	}
}

export function removeFromStorage(key) {
	if (!key) {
		console.error('Error: Key is missing');
	}

	try {
		localStorage.removeItem(key);
	} catch (err) {
		console.error(err);
	}
}
