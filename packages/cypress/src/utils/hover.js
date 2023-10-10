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

const HOVER_TIMEOUT = 2000;

const Hover = {
	node: null,
	timer: null,

	onMouseEnter(e) {
		if (e.target.scrollWidth > e.target.offsetWidth) {
			// text is truncated, so start timer to show hover text
			const target = e.target;
			Hover.timer = setTimeout(function() {
				Hover.timer = null;
				Hover.node = document.createElement('div');
				Hover.node.className = 'bx--tooltip ibp-hover-text';
				Hover.node.appendChild(document.createTextNode(target.innerText));
				const caret = document.createElement('span');
				caret.className = 'bx--tooltip__caret';
				const parent = target.parentNode;
				const parentStyle = getComputedStyle(parent);
				if (!parentStyle.getPropertyValue('position')) {
					parent.style.position = 'relative';
					Hover.position = true;
				}
				Hover.node.appendChild(caret);
				Hover.node.setAttribute('data-floating-menu-direction', 'top');
				parent.appendChild(Hover.node);
			}, HOVER_TIMEOUT);
		}
	},

	onMouseLeave(e) {
		if (Hover.timer) {
			clearTimeout(Hover.timer);
			Hover.timer = null;
		}
		if (Hover.node) {
			Hover.node.parentNode.removeChild(Hover.node);
			Hover.node = null;
		}
	},
};

export default Hover;
