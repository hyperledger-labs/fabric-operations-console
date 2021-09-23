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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import FocusComponent from '../FocusComponent/FocusComponent';

const SCOPE = 'welcomeBanner';
const portalRoot = document.querySelector('#ibp-portal-container');

class WelcomeBanner extends Component {
	componentDidMount() {
		const body = document.querySelector('body');
		body.style.overflow = 'hidden';
		this.openWelcome();
	}

	componentWillUnmount() {
		const body = document.querySelector('body');
		body.style.overflow = 'auto';
	}

	openWelcome = () => {
		this.props.updateState(SCOPE, {
			isOpening: true,
			isClosed: false,
			showWelcomeBanner: true,
		});
		setTimeout(() => {
			this.props.updateState(SCOPE, {
				isOpening: false,
				isOpen: true,
			});
		}, 250);
	};

	closeWelcome = () => {
		this.props.updateState(SCOPE, {
			isClosing: true,
			needsToClose: false,
			isOpen: false,
			showWelcomeBanner: false,
		});
		setTimeout(() => {
			this.props.updateState(SCOPE, {
				isClosing: false,
				isClosed: true,
			});
			if (this.props.closed) {
				this.props.closed();
			}
		}, 250);
	};

	render() {
		let className = 'ibp-welcome-banner-container';
		if (this.props.isOpening) {
			className = `${className} welcome--transitioning--in`;
		}
		if (this.props.isClosing) {
			className = `${className} welcome--transitioning--out`;
		}
		if (this.props.isOpen) {
			className = `${className} welcome--open`;
		}
		return createPortal(
			<div>
				<div className={className}>
					<FocusComponent setFocus={this.props.setFocus}>
						{React.cloneElement(this.props.children, {
							isClosing: this.props.isClosing,
							isClosed: this.props.isClosed,
							isOpening: this.props.isOpening,
						})}
					</FocusComponent>
				</div>
			</div>,
			portalRoot ? portalRoot : document.body
		);
	}
}

const dataProps = {
	isClosing: PropTypes.bool,
	isClosed: PropTypes.bool,
	isOpening: PropTypes.bool,
	isOpen: PropTypes.bool,
	needsToClose: PropTypes.bool,
	docsUrl: PropTypes.string,
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

WelcomeBanner.propTypes = {
	...dataProps,
	closed: PropTypes.func,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	},
	null,
	{
		forwardRef: true,
	}
)(WelcomeBanner);
