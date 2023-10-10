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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import SVGs from '../Svgs/Svgs';

export class VisibilityToggle extends Component {
	componentDidMount() {
		this.setState({ visible: this.isVisible() });
	}

	isVisible() {
		const node = document.getElementById(this.props.idToToggle);
		if (node) {
			if (node.type === 'password') {
				return false;
			}
			if (node.type === 'text') {
				return true;
			}
			if (node.textContent === this.props.hidden) {
				return false;
			}
		}
		return true;
	}

	toggle = () => {
		const node = document.getElementById(this.props.idToToggle);
		if (node) {
			if (node.type === 'password') {
				node.type = 'text';
				this.setState({ visible: true });
				setTimeout(() => {
					node.focus();
				}, 1);
				return;
			}
			if (node.type === 'text') {
				node.type = 'password';
				this.setState({ visible: false });
				setTimeout(() => {
					node.focus();
				}, 10);
				return;
			}
			const text = node.textContent;
			if (text === this.props.text) {
				while (node.firstChild) {
					node.removeChild(node.firstChild);
				}
				node.appendChild(document.createTextNode(this.props.hidden));
				this.setState({ visible: false });
				return;
			}
			if (text === this.props.hidden) {
				while (node.firstChild) {
					node.removeChild(node.firstChild);
				}
				node.appendChild(document.createTextNode(this.props.text));
				this.setState({ visible: true });
				return;
			}
		}
	};

	render() {
		const visible = this.state ? this.state.visible : this.isVisible();
		const translate = this.props.translate;
		return (
			<button
				id={this.props.idToToggle + '-toggle'}
				className="ibp-visibility-toggle"
				title={translate(visible ? 'hide_password' : 'show_password')}
				onClick={this.toggle}
				type="button"
			>
				<SVGs type={visible ? 'visibilityOff' : 'visibilityOn'} />
			</button>
		);
	}
}

VisibilityToggle.propTypes = {
	idToToggle: PropTypes.string,
	hidden: PropTypes.string,
	text: PropTypes.string,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(VisibilityToggle);
