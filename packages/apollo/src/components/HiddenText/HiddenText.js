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
import Hover from '../../utils/hover';
import VisibilityToggle from '../VisibilityToggle/VisibilityToggle';

class HiddenText extends Component {
	onMouseEnter = e => {
		const node = document.getElementById(this.props.id);
		if (node) {
			if (node.textContent === this.props.text) {
				Hover.onMouseEnter(e);
			}
		}
	};

	onMouseLeave = e => {
		Hover.onMouseLeave(e);
	};

	render() {
		const text = this.props.text || '';
		let hidden = '';
		while (hidden.length < text.length) {
			hidden = hidden + '\u2022';
		}
		return (
			<div className="ibp-hidden-text">
				{this.props.label && (
					<div>
						<p className={this.props.labelClassName}>
							{this.props.label}
							<VisibilityToggle idToToggle={this.props.id}
								text={text}
								hidden={hidden}
							/>
						</p>
						<p id={this.props.id}
							className={this.props.className}
						>
							{hidden}
						</p>
					</div>
				)}
				{!this.props.label && (
					<div>
						<div id={this.props.id}
							className={this.props.className}
							onMouseEnter={this.onMouseEnter}
							onMouseLeave={this.onMouseLeave}
						>
							{hidden}
						</div>
						<VisibilityToggle idToToggle={this.props.id}
							text={text}
							hidden={hidden}
						/>
					</div>
				)}
			</div>
		);
	}
}

HiddenText.propTypes = {
	id: PropTypes.string.isRequired,
	text: PropTypes.string,
	label: PropTypes.string,
	className: PropTypes.string,
	labelClassName: PropTypes.string,
};

export default HiddenText;
