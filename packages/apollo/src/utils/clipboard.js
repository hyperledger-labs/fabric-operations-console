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
const Clipboard = {
	/**
	 * @param {string} text Text to be copied to the clipboard.
	 * @return {boolean} True if the text was copied. False otherwise.
	 */
	copyToClipboard(text) {
		if (text.length) {
			if (navigator && navigator.clipboard) {
				navigator.clipboard.writeText(text).then(
					() => {
						return;
					},
					error => {
						return error;
					}
				);
			} else {
				// fallback method for copying text to clipboard (ie for safari)
				const textarea = document.createElement('textarea');
				textarea.textContent = text;
				textarea.style.position = 'fixed'; // prevent scrolling to bottom of page
				// we need to append the text area to the side panel DOM element because the body has an overflow of hidden
				// when the panel is open, which prevents us from being able to select the text in order to copy it.
				const mainContent = document.querySelectorAll('.ibp-panel--content');
				mainContent.length ? mainContent[0].appendChild(textarea) : document.body.appendChild(textarea);
				textarea.select();
				try {
					return document.execCommand('copy'); // security exception may be thrown by some browsers.
				} catch (error) {
					return false;
				} finally {
					mainContent.length ? mainContent[0].removeChild(textarea) : document.body.removeChild(textarea);
				}
			}
		} else {
			// text passed is either undefined, null, or empty string
			return;
		}
	},
};

export default Clipboard;
