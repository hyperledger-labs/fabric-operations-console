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
import { Loading } from 'carbon-components-react';
import FocusTrap from 'focus-trap-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { Translation } from 'react-i18next';
import Helper from '../../utils/helper';
import { updateSidePanel } from '../SidePanel/sidePanelActions';
import SidePanelError from '../SidePanelError/SidePanelError';
import SVGs from '../Svgs/Svgs';
import { setInStorage } from '../../utils/localStorage';

const portalRoot = document.querySelector('#ibp-portal-container');

export class SidePanel extends React.Component {
	componentDidMount() {
		const body = document.querySelector('body');
		body.style.overflow = 'hidden';
		this.openSidePanel();
	}

	componentWillUnmount() {
		const body = document.querySelector('body');
		body.style.overflow = 'auto';
	}

	openSidePanel = () => {
		this.props.updateSidePanel({
			isOpening: true,
			rgbaVal: 0,
		});
		setTimeout(
			() => {
				this.props.updateSidePanel({
					isOpening: false,
					rgbaVal: 0.5,
				});
			},
			this.props.largePanel ? 458 : 250
		);
	};

	closeSidePanel = () => {
		if (this.props.diagramWizard) {
			setInStorage('showDiagram', false);
		}
		this.props.updateSidePanel({
			isClosing: true,
			rgbaVal: 0,
			needsToClose: false,
		});
		setTimeout(
			() => {
				this.props.updateSidePanel({
					isClosing: false,
				});
				if (this.props.closed) {
					this.props.closed();
				}
			},
			this.props.largePanel ? 458 : 100
		);
	};

	renderButtons() {
		if (this.props.buttons && this.props.buttons.length) {
			return (
				<div
					className={`ibp-button-container
					${this.props.largePanel ? 'ibp-large-panel-button-container' : ''}
					${this.props.extraLargePanel ? 'ibp-extra-large-panel-button-container' : ''}
					${this.props.verticalPanel ? 'ibp-vertical-panel-button-container' : ''}
					${this.props.fullPageCenter ? 'ibp-full-page-center-panel-button-container ' : ''}
				`}
				>
					{this.props.warningTxt &&
						<p className='warnText'>{this.props.warningTxt}</p>
					}
					{this.props.buttons.map(button => {
						return (
							<button
								id={button.id}
								key={button.id}
								onClick={button.onClick ? button.onClick : this.closeSidePanel}
								className="ibp-button ibm-label"
								disabled={button.disabled}
							>
								<span>{button.text}</span>
								{this.props.submitting && button.type === 'submit' && <Loading withOverlay={false}
									small
									className="ibp-side-panel-submitting-spinner"
								/>}
								{!this.props.submitting && button.icon && button.icon}
							</button>
						);
					})}
				</div>
			);
		}
	}

	renderFooter() {
		if (!this.props.footer) {
			return;
		}
		return <div className="ibp-panel-footer">{this.props.footer}</div>;
	}

	renderErrors() {
		if (!this.props.error) {
			return;
		}
		if (_.isArray(this.props.errors)) {
			return (
				<div>
					{this.props.errors.map((error, index) => {
						return <SidePanelError key={'error_' + index}
							error={error}
						/>;
					})}
				</div>
			);
		} else {
			return <SidePanelError error={this.props.error} />;
		}
	}

	render() {
		let className = (this.props.verticalPanel || this.props.fullPageCenter) ? 'vertical__panel--outer--container' : 'side__panel--outer--container';

		if (this.props.isOpening) {
			className =
				className +
				`${this.props.largePanel ? ' side__panel--large--transitioning--in' :
					this.props.verticalPanel ? ' vertical__panel--transitioning--in' :
						this.props.fullPageCenter ? ' '
							: ' side__panel--transitioning--in'
				}`;
		}
		if (this.props.isClosing) {
			className =
				className +
				`${this.props.largePanel ? ' side__panel--large--transitioning--out' :
					this.props.verticalPanel ? ' vertical__panel--transitioning--out' :
						this.props.fullPageCenter ? ' '
							: ' side__panel--transitioning--out'
				}`;
		}
		if (this.props.error) {
			className = `${className} ${this.props.largePanel ? ' ibp-large-panel-error' : ''}`;
		}
		const { toBeArchivedList, showRequests } = this.props;
		return createPortal(
			<Translation>
				{(t) => (
					<FocusTrap
						active={this.props.disable_focus_trap ? false : true}
						focusTrapOptions={{
							escapeDeactivates: false,
							fallbackFocus: 'body'
						}}
					>
						<div
							id={this.props.id}
							className={className}
							role="dialog"
							aria-label={`${t('product_label')} ${t('panel')}`}
						>
							<div
								className="ibp-panel--container"
								style={{
									backgroundColor: `rgba(0,0,0,${this.props.rgbaVal})`,
								}}
								onClick={this.props.clickAway ? this.closeSidePanel : null}
							/>
							{!this.props.hideClose && (
								<button
									className={`
									ibp-panel--close-icon-button
									${this.props.verticalPanel ? 'ibp-vertical-panel-close' : ''}
									${this.props.fullPageCenter ? 'ibp-full-page-center-panel-close' : ''}
									`}
									onClick={this.closeSidePanel}
									aria-label="Close"
									style={{
										zIndex: (showRequests && toBeArchivedList && toBeArchivedList.length < 1) || !showRequests ? 6000 : 0,
									}}
								>
									<SVGs type="close"
										height="16px"
										width="16px"
									/>
								</button>
							)}
							<div
								className={`
									ibp-panel--content
									${this.props.largePanel ? 'ibp-large-panel' : ''}
									${this.props.extraLargePanel ? 'ibp-extra-large-panel' : ''}
									${!this.props.buttons ? 'ibp-panel--content-no-buttons' : ''}
									${this.props.verticalPanel ? 'ibp-vertical-panel' : ''}
									${this.props.fullPageCenter ? 'ibp-full-page-center-panel' : ''}
								`}
							>
								<div className="ibp-panel-content-flex-div">
									<div className={`
										ibp-panel-content-children
										${this.props.fullPageCenter ? 'ibp-full-page-center-children' : ''}
											`}
									>
										{this.props.children}
									</div>
									{this.renderFooter()}
									{this.renderErrors()}
								</div>
							</div>
							{this.renderButtons()}
							{this.props.submitting && (
								<div
									className={`ibp-side-panel-submitting-overlay
										${this.props.largePanel ? 'ibp-large-side-panel-overlay' : ''}
										${(this.props.verticalPanel || this.props.fullPageCenter) ? 'ibp-vertical-panel-overlay' : ''}`}
								/>
							)}
						</div>
					</FocusTrap>
				)}
			</Translation>,
			portalRoot ? portalRoot : document.body
		);
	}
}

const dataProps = {
	id: PropTypes.string,
	children: PropTypes.any,
	rgbaVal: PropTypes.number,
	isOpening: PropTypes.bool,
	isClosing: PropTypes.bool,
	needsToClose: PropTypes.bool,
	disable_focus_trap: PropTypes.bool,
	buttons: PropTypes.array,
	error: PropTypes.any,
	largePanel: PropTypes.bool,
	submitting: PropTypes.bool,
	footer: PropTypes.any,
	toBeArchivedNotifications: PropTypes.array,
	showRequests: PropTypes.bool,
	clickAway: PropTypes.bool,
	hideClose: PropTypes.bool,
	warningTxt: PropTypes.string,
};

SidePanel.propTypes = {
	...dataProps,
	closed: PropTypes.func,
	updateSidePanel: PropTypes.func,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state.sidePanel, dataProps);
		newProps['toBeArchivedList'] = state['signatureCollection'] ? state['signatureCollection']['toBeArchivedList'] : null;
		newProps['showRequests'] = state['signatureCollection'] ? state['signatureCollection']['showRequests'] : null;
		return newProps;
	},
	{
		updateSidePanel,
	},
	null,
	{
		forwardRef: true,
	}
)(SidePanel);
