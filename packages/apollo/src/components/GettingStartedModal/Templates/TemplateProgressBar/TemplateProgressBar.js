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
import { Translate } from 'react-localize-redux';
import PropTypes from 'prop-types';
import Maximize16 from '@carbon/icons-react/lib/maximize/16';
import Close20 from '@carbon/icons-react/lib/close/16';
import Warning16 from '@carbon/icons-react/lib/warning--alt--filled/16';
import { yellow } from '@carbon/colors';

const TemplateProgressBar = ({
	templateName,
	currentDeploymentStep,
	totalDeploymentSteps,
	showTemplate,
	templateComplete,
	clearProgress,
	showResumeTemplateDeploymentMsg,
	resumeTemplateDeployment,
}) => {
	return (
		<Translate>
			{({ translate }) => (
				<div className="ibp-template-progress-bar-container">
					{!showResumeTemplateDeploymentMsg && (
						<>
							<p className="ibp-template-progress-bar-label">
								{translate(templateComplete ? 'deployed_successful' : 'deploying')} {templateName}
							</p>
							<div
								className="ibp-template-progress-bar"
								style={{
									width: templateComplete ? '78%' : '83%',
									paddingLeft: showResumeTemplateDeploymentMsg ? '1rem' : '0',
								}}
							>
								<span
									className="ibp-template-progress-fill"
									style={{
										width: `calc((${currentDeploymentStep}% / ${totalDeploymentSteps}) * 100)`,
										backgroundColor: templateComplete ? '#24a148' : '#4589ff',
									}}
								/>
								<span className="ibp-template-progress-fill-background" />
							</div>
						</>
					)}
					{showResumeTemplateDeploymentMsg && (
						<div className="ibp-template-warning-message-container">
							<Warning16 fill={yellow} />
							<p className="ibp-template-warning-message">{translate('template_requires_attention')}</p>
						</div>
					)}
					<div className="ibp-template-progress-bar-actions">
						{showResumeTemplateDeploymentMsg && (
							<a className="ibp-template-progress-bar-label ibp-link ibp-template-resume-link"
								onClick={event => resumeTemplateDeployment(event)}
								href="/"
							>
								{translate('resume_template_deployment')}
							</a>
						)}
						<button className="ibp-template-maximize-button"
							onClick={templateComplete ? () => clearProgress() : () => showTemplate('templatePage')}
						>
							{templateComplete ? (
								<Close20
									style={{
										fill: '#fff',
									}}
									className="ibp-template-maximize-icon"
								/>
							) : (
								<Maximize16
									style={{
										fill: '#fff',
									}}
									className="ibp-template-maximize-icon"
								/>
							)}
						</button>
					</div>
				</div>
			)}
		</Translate>
	);
};

TemplateProgressBar.propTypes = {
	templateName: PropTypes.string,
	currentDeploymentStep: PropTypes.number,
	showTemplate: PropTypes.func,
	clearProgress: PropTypes.func,
	totalDeploymentSteps: PropTypes.number,
	templateComplete: PropTypes.bool,
	showResumeTemplateDeploymentMsg: PropTypes.bool,
	resumeTemplateDeployment: PropTypes.func,
};

export default TemplateProgressBar;
