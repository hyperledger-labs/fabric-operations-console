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
import { Translate } from 'react-localize-redux';
import ComplexityScale from '../../../ComplexityScale/ComplexityScale';
import CheckmarkFilled20 from '@carbon/icons-react/lib/checkmark--filled/20';

const CustomTiles = ({ templateChoices, selectedTemplate, setSelectedTemplate }) => {
	return (
		<Translate>
			{({ translate }) =>
				templateChoices.map(template => (
					<button
						key={template.id}
						className={`ibp--template-type-selectable-button ${
							selectedTemplate && selectedTemplate.id === template.id ? 'ibp--template-currently-selected' : ''
						}`}
						onClick={() => setSelectedTemplate(template)}
					>
						<>
							<h5>{translate(template.id)}</h5>
							{template.id !== 'upload_custom_template' && <p className="ibp-template-tile-desc">{translate(template.desc)}</p>}
							{template.id === 'upload_custom_template' && <p className="ibp-template-tile-desc">{translate(template.subtext)}</p>}
						</>
						<ComplexityScale
							level={template.complexity === 'simple' ? translate('simple') : template.complexity === 'moderate' ? translate('moderate') : translate('complex')}
						/>
						<CheckmarkFilled20 className="ibp-selected-template-checkmark" />
					</button>
				))
			}
		</Translate>
	);
};

const TemplateChoices = ({ templateChoices, selectedTemplate, setSelectedTemplate }) => {
	return (
		<Translate>
			{({ translate }) => (
				<div>
					<h1 className="ibp-template-header">{translate('select_template')}</h1>
					<div className="bx--row">
						<div className="ibp--template--main-content bx--col-lg-13">
							<div className="ibp--template-list-container">
								<CustomTiles templateChoices={templateChoices}
									selectedTemplate={selectedTemplate}
									setSelectedTemplate={setSelectedTemplate}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</Translate>
	);
};

CustomTiles.propTypes = {
	templateChoices: PropTypes.array,
	selectedTemplate: PropTypes.object,
	setSelectedTemplate: PropTypes.func,
};

TemplateChoices.propTypes = {
	templateChoices: PropTypes.array,
	selectedTemplate: PropTypes.object,
	setSelectedTemplate: PropTypes.func,
};

export default TemplateChoices;
