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
import React from 'react';
import PropTypes from 'prop-types';
import SVGs from '../Svgs/Svgs';

const Stepper = props => {
	const initialWidth = { width: '0.5rem' };
	const progressWidth = { width: `calc(((${props.currentStep - 1}% / ${props.stepItems.length}) * 100) + 16px)` };
	return (
		<div className="ibp-stepper-container">
			<div className="ibp-stepper-progress-container">
				<span className="ibp-stepper-progress-default" />
				<div className="ibp-stepper-progress-line"
					style={props.currentStep === 1 ? initialWidth : progressWidth}
				/>
			</div>
			<section className="ibp-stepper-steps-container">
				{props.stepItems.map(step => {
					return (
						<div className="ibp-stepper-step"
							key={step.stepId}
						>
							{props.currentStep === step.stepId && <SVGs type="stepperCurrent" />}
							{props.currentStep < step.stepId && <SVGs type="stepperIncomplete" />}
							{props.currentStep > step.stepId && <SVGs type="stepperComplete" />}
							<span className="ibp-stepper-step-name">{step.stepName}</span>
						</div>
					);
				})}
			</section>
		</div>
	);
};

Stepper.propTypes = {
	currentStep: PropTypes.number,
	stepItems: PropTypes.array,
};

export default Stepper;
