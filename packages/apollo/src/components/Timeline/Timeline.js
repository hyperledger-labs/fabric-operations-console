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
import React from 'react';
import PropTypes from 'prop-types';
import { withLocalize } from 'react-localize-redux';
import TimelineCancelButton from '../TimelineCancelButton/TimelineCancelButton';
import CheckmarkOutline16 from '@carbon/icons-react/lib/checkmark--outline/16';

const Timeline = ({ steps, onClose, selectedTimelineStep, header, estTime, progressWithChecks, translate }) => {
	return (
		<div className="ibp-vertical-panel-timeline-container">
			<div className="ibp-vertical-panel-timeline-steps">
				<h3>{header}</h3>
				{<p className="ibp-template-timeline-estimate">{estTime}</p>}
				{steps.map((step, index) => {
					const currentStep = step[0];
					return (
						<div key={index}>
							{currentStep.groupTitle && <p className="ibp-timeline-group-label">{translate(currentStep.groupTitle)}</p>}
							<div
								className={`ibp-timeline-step-container ${currentStep.groupSteps.length === 1 ? 'ibp-timeline-step-container-short' : ''} ${
									!progressWithChecks ? 'ibp-timeline-step-container-without-checks' : ''
								}`}
								key={currentStep.groupTitle}
							>
								{currentStep.groupSteps.map((groupStep, groupStepIndex) => {
									let incompleteStep = index === selectedTimelineStep.currentStepIndex && selectedTimelineStep.currentStepInsideOfGroupIndex < groupStepIndex;
									let completedStep = selectedTimelineStep.currentStepIndex === index && selectedTimelineStep.currentStepInsideOfGroupIndex > groupStepIndex;
									return (
										<div className="ibp-timeline-group-step-container"
											key={groupStep.label}
										>
											{progressWithChecks && incompleteStep && <span className="ibp-template-timeline-incomplete-step" />}
											{progressWithChecks && index > selectedTimelineStep.currentStepIndex && <span className="ibp-template-timeline-incomplete-step" />}
											{progressWithChecks && index < selectedTimelineStep.currentStepIndex && (
												<CheckmarkOutline16 className="ibp-template-timeline-completed-step-svg" />
											)}
											{progressWithChecks && completedStep && <CheckmarkOutline16 className="ibp-template-timeline-completed-step-svg" />}
											{progressWithChecks &&
												selectedTimelineStep.currentStepIndex === index &&
												selectedTimelineStep.currentStepInsideOfGroupIndex === groupStepIndex && <span className="ibp-template-timeline-current-step" />}
											{!progressWithChecks &&
												selectedTimelineStep.currentStepInsideOfGroupIndex === groupStepIndex &&
												selectedTimelineStep.currentStepIndex === index && <span className="ibp-timeline-current-step-indicator" />}
											{groupStep.isLink && !groupStep.disabled ? (
												<button className="ibp-template-timeline-label"
													onClick={groupStep.onClick}
												>
													{translate(groupStep.label)}
												</button>
											) : (
												<span
													className={`ibp-timeline-label-only ${currentStep.type === 'intro' ? 'ibp-timeline-intro-step' : ''} ${
														groupStep.disabled ? 'ibp-timeline-disabled-step' : ''
													}`}
												>
													{translate(groupStep.label)}
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
			<TimelineCancelButton onClose={onClose} />
		</div>
	);
};

Timeline.propTypes = {
	header: PropTypes.string,
	estTime: PropTypes.string,
	steps: PropTypes.arrayOf(
		PropTypes.arrayOf(
			PropTypes.shape({
				type: PropTypes.string,
				groupTitle: PropTypes.string,
				groupSteps: PropTypes.arrayOf(
					PropTypes.shape({
						label: PropTypes.string,
						onClick: PropTypes.func,
						isLink: PropTypes.bool,
						disabled: PropTypes.bool,
					})
				),
			})
		)
	).isRequired,
	onClose: PropTypes.func,
	selectedTimelineStep: PropTypes.shape({
		currentStepInsideOfGroupIndex: PropTypes.number,
		currentStepIndex: PropTypes.number,
	}),
	progressWithChecks: PropTypes.bool,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(Timeline);
