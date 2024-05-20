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
import _ from 'lodash';
import { Loading } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import BlockchainTooltip from '../BlockchainTooltip/BlockchainTooltip';
import FocusComponent from '../FocusComponent/FocusComponent';
import SidePanel from '../SidePanel/SidePanel';

const SCOPE = 'wizard';

class Wizard extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			error: undefined,
			step: 1,
			submitting: false,
		});
		this.setFocus();
	}

	onCancel = () => {
		this.props.updateState(SCOPE, {
			error: '',		// clear/hide the error message on cancel
		});

		const steps = this.getWizardSteps();
		const current_step = steps[this.props.step - 1];
		if (this.props.submitting) {
			return;
		}
		if (current_step && current_step.props.onCancel) {
			current_step.props.onCancel();
		} else {
			if (this.props.step === 1) {
				this.sidePanel.closeSidePanel();
			} else {
				this.props.updateState(SCOPE, {
					step: this.props.step - 1,
				});
				this.setFocus();
			}
		}
	};

	isWizardStep(child) {
		if (child && child.props && child.props.type === 'WizardStep') {
			return true;
		}
		return false;
	}

	getWizardSteps() {
		const steps = [];
		const children = _.isArray(this.props.children) ? this.props.children : [this.props.children];
		children.forEach(child => {
			if (this.isWizardStep(child)) {
				steps.push(child);
			}
		});
		return steps;
	}

	setFocus() {
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	}

	onSubmit = () => {
		if (this.props.submitting) {
			return;
		}
		const steps = this.getWizardSteps();
		const total = steps.length;
		if (this.props.step < total) {
			if (steps[this.props.step - 1].props.onNext) {
				this.props.updateState(SCOPE, {
					submitting: true,
					error: undefined,
				});
				steps[this.props.step - 1].props
					.onNext()
					.then(() => {
						this.props.updateState(SCOPE, {
							submitting: false,
							step: this.props.step + 1,
						});
						this.setFocus();
					})
					.catch(error => {
						this.props.updateState(SCOPE, {
							submitting: false,
							error,
						});
					});
			} else {
				this.props.updateState(SCOPE, {
					step: this.props.step + 1,
				});
				this.setFocus();
			}
		} else {
			this.props.updateState(SCOPE, {
				submitting: true,
				error: undefined,
			});
			this.props
				.onSubmit()
				.then(() => {
					this.props.updateState(SCOPE, {
						submitting: false,
					});
					this.sidePanel.closeSidePanel();
				})
				.catch(error => {
					this.props.updateState(SCOPE, {
						submitting: false,
						error,
					});
				});
		}
	};

	renderChildren(translate) {
		let key = 0;
		let step = 0;
		const children = _.isArray(this.props.children) ? this.props.children : [this.props.children];
		return (
			<div>
				{children.map(child => {
					key++;
					if (!this.isWizardStep(child)) {
						return <div key={'key_' + key}>{child}</div>;
					}
					step++;
					return (
						<div key={'key_' + key}
							className={this.props.step !== step ? 'hidden_section' : 'visible_section'}
						>
							<p className="ibp-wizard-step-header-desc">
								{!!child.props.headerDesc && child.props.headerDesc}
								{child.props.headerLink && child.props.headerLinkText && <div className="ibp-wizard-link-spacer" />}
								{child.props.headerLink && child.props.headerLinkText && (
									<a className="ibp-link"
										href={child.props.headerLink}
										target="_blank"
										rel="noopener noreferrer"
									>
										{child.props.headerLinkText}
									</a>
								)}
							</p>
							{child.props.title && this.props.title && (
								<h2 className="ibp-wizard-step-header">
									{!child.props.tooltip && translate(child.props.title)}
									{child.props.tooltip && (
										<span className="ibp-wizard-step-tooltip">
											<BlockchainTooltip triggerText={child.props.title}>{child.props.tooltip}</BlockchainTooltip>
										</span>
									)}
								</h2>
							)}
							{child.props.title && !this.props.title && (
								<h1 className="ibp-wizard-title">
									{!child.props.tooltip && translate(child.props.title)}
									{child.props.tooltip && (
										<span className="ibp-wizard-step-tooltip">
											<BlockchainTooltip triggerText={child.props.title}>{child.props.tooltip}</BlockchainTooltip>
										</span>
									)}
								</h1>
							)}
							{!this.props.loading && child.props.desc && <p className="ibp-wizard-step-desc">{child.props.desc}</p>}
							{child}
						</div>
					);
				})}
			</div>
		);
	}

	isSubmitDisabled() {
		let step = 0;
		let submitDisabled = false;
		const children = _.isArray(this.props.children) ? this.props.children : [this.props.children];
		children.forEach(child => {
			if (this.isWizardStep(child)) {
				step++;
				if (this.props.step === step) {
					submitDisabled = child.props.disableSubmit;
				}
			}
		});
		return submitDisabled || this.props.loading;
	}

	getErrorMessage(translate) {
		const error = this.props.error;
		// if the error already contains its own translation info, just pass it through and let the SidePanel deal with it.
		if (error instanceof Error && error.translation) return error;

		// Fallback to the old way of processing errors where we have to account for all manner of error types/shapes.
		if (error) {
			if (_.isString(error)) {
				return {
					title: error,
				};
			}
			if (error.title) {
				return error;
			} else {
				return {
					title: 'error_unexpected',
					details: error,
				};
			}
		}
		return null;
	}

	getCurrentFooter() {
		const steps = this.getWizardSteps();
		if (this.props.step <= steps.length) {
			if (steps[this.props.step - 1].props.footer) {
				return steps[this.props.step - 1].props.footer;
			}
		}
		return;
	}

	getButtons(steps, translate) {
		const total = steps.length;
		const buttons = [];
		if (!this.props.noCancel) {
			buttons.push({
				id: this.props.step === 1 ? this.props.cancelButtonId || 'cancel' : 'back',
				text: this.props.step === 1 ? this.props.cancelButtonLabel || translate('cancel') : translate('back'),
				onClick: this.onCancel,
			});
		}
		if (this.props.middleButton) {
			buttons.push({
				id: this.props.middleButton.id,
				text: this.props.middleButton.label,
				onClick: this.props.middleButton.onClick,
				disabled: this.props.middleButton.disabled,
			});
		}
		if (this.props.onSubmit || this.props.step < total) {
			const current_step = steps[this.props.step - 1];
			let next_label = translate('next');
			if (current_step && current_step.props && current_step.props.nextButtonLabel) {
				next_label = current_step.props.nextButtonLabel;
			}
			buttons.push({
				id: this.props.step === total ? this.props.submitButtonId || 'submit' : 'next',
				text: this.props.step === total ? this.props.submitButtonLabel || translate('submit') : next_label,
				onClick: this.onSubmit,
				disabled: this.isSubmitDisabled(),
				type: 'submit',
			});
		}
		return buttons;
	}

	render() {
		const steps = this.getWizardSteps();
		const total = steps.length;
		const translate = this.props.t;
		return (
			<SidePanel
				disable_focus_trap={this.props.disable_focus_trap}
				closed={this.props.onClose}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				buttons={this.getButtons(steps, translate)}
				error={this.getErrorMessage(translate)}
				submitting={this.props.submitting || this.props.showSubmitSpinner}
				footer={this.getCurrentFooter()}
				extraLargePanel={this.props.extraLargePanel}
				largePanel={this.props.largePanel}
				diagramWizard={this.props.diagramWizard}
				loading={this.props.loading}
			>
				<div className={this.props.step === 1 ? 'ibp-wizard-first-step' : 'ibp-wizard-secondary-step'}>
					{total > 1 && (
						<div className="ibp-wizard-step">
							{translate('step_n_of_x', {
								step: this.props.step,
								total,
							})}
						</div>
					)}
					{total === 1 && (
						<div className="ibp-wizard-step">&nbsp;</div>
					)}
					{!!this.props.title && <h1 className="ibp-wizard-title">{translate(this.props.title)}</h1>}
					<FocusComponent setFocus={this.props.setFocus}>{this.renderChildren(translate)}</FocusComponent>

					{/* loading animation/spinner svg here */}
					{this.props.loading && <Loading withOverlay={false}
						className="ibp-wizard-loading"
					/>}
				</div>
			</SidePanel>
		);
	}
}

const dataProps = {
	title: PropTypes.string,
	submitting: PropTypes.bool,
	step: PropTypes.number,
	disable_focus_trap: PropTypes.bool,
	error: PropTypes.any,
	loading: PropTypes.bool,
	submitButtonLabel: PropTypes.string,
	extraLargePanel: PropTypes.bool,
	setFocus: PropTypes.bool,
};

Wizard.propTypes = {
	...dataProps,
	largePanel: PropTypes.bool,
	onSubmit: PropTypes.func,
	onClose: PropTypes.func,
	onNext: PropTypes.func,
	updateState: PropTypes.func,
	submitButtonId: PropTypes.string,
	submitButtonLabel: PropTypes.string,
	cancelButtonId: PropTypes.string,
	cancelButtonLabel: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
	showSubmitSpinner: PropTypes.bool,
	middleButton: PropTypes.object,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(Wizard));
