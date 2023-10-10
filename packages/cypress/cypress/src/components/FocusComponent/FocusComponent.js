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
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';

const SCOPE = 'focusComponent';

class FocusComponent extends Component {
	constructor(props) {
		super(props);
		this.htmlElement = React.createRef();
	}

	setFocus(element) {
		let focusSet = false;
		if (!element) {
			return false;
		}
		let className = element.className;
		className = className && typeof className === 'string' ? className.trim() : '';
		const currentStyle = element.tagName ? window.getComputedStyle(element) : {};
		if (currentStyle.display === 'none') {
			// don't set focus on hidden sections
			return false;
		}
		if (className === 'ibp-form-label') {
			// don't set focus on form labels (let it find the actual field instead)
			return false;
		}
		if (className === 'bx--tile-input') {
			// don't set focus on the "hidden" radio button for a tile
			return false;
		}
		if (className === 'ibp-tooltip-container') {
			// don't set focus on toolips
			return false;
		}
		let tabIndex = element.getAttribute ? element.getAttribute('tabIndex') : element.tabIndex;
		if (tabIndex) {
			tabIndex = Number(tabIndex);
			if (tabIndex >= 0 && !element.hasAttribute('disabled')) {
				element.focus();
				focusSet = true;
				this.props.updateState(SCOPE, { focusSet });
			}
		} else {
			let tagName = element.tagName;
			if (tagName) {
				switch (tagName.toLowerCase()) {
					case 'a':
					case 'button':
					case 'input':
						if (!element.hasAttribute('disabled')) {
							element.focus();
							focusSet = true;
							this.props.updateState(SCOPE, { focusSet: null });
						}
						break;
					default:
						break;
				}
			}
		}
		for (let child = element.firstChild; child && !focusSet; child = child.nextSibling) {
			focusSet = this.setFocus(child);
		}
		return focusSet;
	}

	setFocusWhenReady = () => {
		if (this.mounted) {
			const focusSet = this.setFocus(this.htmlElement.current);
			if (!focusSet) {
				window.setTimeout(this.setFocusWhenReady, 250);
			}
		}
	};

	componentDidMount() {
		this.props.updateState(SCOPE, { focusSet: null });
		this.mounted = true;
		if (this.props.setFocus !== false) {
			window.setTimeout(this.setFocusWhenReady, 250);
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, { focusSet: null });
		this.mounted = false;
	}

	componentDidUpdate(prevProps) {
		if (prevProps.setFocus === false && this.props.setFocus !== false) {
			window.setTimeout(this.setFocusWhenReady, 250);
		}
	}

	render() {
		return (
			<div
				style={{
					height: '100%',
					outline: 'none',
				}}
				ref={this.htmlElement}
				tabIndex={this.props.focusSet ? -1 : 0}
			>
				{this.props.children}
			</div>
		);
	}
}

const dataProps = {
	focusSet: PropTypes.bool,
};

FocusComponent.propTypes = {
	...dataProps,
	children: PropTypes.node,
	setFocus: PropTypes.bool,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(FocusComponent);
