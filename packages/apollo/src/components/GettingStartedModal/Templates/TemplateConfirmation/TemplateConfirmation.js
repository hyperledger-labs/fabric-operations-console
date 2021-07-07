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

const RenderUsageRows = ({ translate, templatePeers, templateCAs, templateOrderers, selectedTemplate }) => {
	if (selectedTemplate) {
		return (
			<>
				<div className="ibp-template-usage-row">
					<div>{translate('peer')}</div>
					<div>{`20GB${templatePeers.length && `*${templatePeers.length}`}`}</div>
					<div>{`2 VPC${templatePeers.length && `*${templatePeers.length}`}`}</div>
				</div>
				<div className="ibp-template-usage-row">
					<div>{translate('ca')}</div>
					<div>{`30GB${templateCAs.length && `*${templateCAs.length}`}`}</div>
					<div>{`1 VPC${templateCAs.length && `*${templateCAs.length}`}`}</div>
				</div>
				<div className="ibp-template-usage-row">
					<div>{translate('orderer')}</div>
					<div>{`20GB${templateOrderers.length && `*${templateOrderers.length}`}`}</div>
					<div>{`0.5 VPC${templateOrderers.length && `*${templateOrderers.length}`}`}</div>
				</div>
			</>
		);
	} else {
		return (
			<>
				<div className="ibp-template-usage-row">
					<div>{translate('peer')}</div>
					<div>-</div>
					<div>-</div>
				</div>
				<div className="ibp-template-usage-row">
					<div>{translate('ca')}</div>
					<div>-</div>
					<div>-</div>
				</div>
				<div className="ibp-template-usage-row">
					<div>{translate('orderer')}</div>
					<div>-</div>
					<div>-</div>
				</div>
			</>
		);
	}
};

const TemplateConfirmation = ({ selectedTemplate, templateResponse, templatePeers, templateCAs, templateOrderers }) => {
	return (
		<Translate>
			{({ translate }) => (
				<div className="ibp-template-confirm-section">
					<h2 className="ibp-selected-template-header">{translate('confirm_deployment')}</h2>
					<p className="ibp-selected-template-desc">{translate('confirm_deployment_desc')}</p>
					<div className="ibp--selected-template-estimate-container bx--col-lg-6">
						<div className="ibp-template-usage-intro">
							<h4 className="ibp--template-usage-header">{translate('resource_estimate')}</h4>
						</div>
						<div className="ibp-template-usage-table">
							<div className="ibp-template-usage-row">
								<div className="ibp-template-usage-row-header">{translate('component')}</div>
								<div className="ibp-template-usage-row-header">{translate('storage')}</div>
								<div className="ibp-template-usage-row-header">{translate('vpc_usage')}</div>
							</div>
							<RenderUsageRows
								translate={translate}
								templatePeers={templatePeers}
								templateCAs={templateCAs}
								templateOrderers={templateOrderers}
								selectedTemplate={selectedTemplate}
							/>
						</div>
						<div className="ibp-template-usage-iks">
							<h5 className="ibp-template-usage-desc">{translate('please_ensure_you_have')}</h5>
							{selectedTemplate && templateResponse ? (
								<>
									<p className="ibp-template-usage-number">{`${templateResponse.resp.total_resources.storage_friendly_units} ${translate('storage')}`}</p>
									<p className="ibp-template-usage-number">{`${templateResponse.resp.total_resources.cpus} ${translate('vpc_abbrev')}`}</p>
									<p className="ibp-template-usage-number">{`${templateResponse.resp.total_resources.memory_friendly_units} ${translate('memory')}`}</p>
								</>
							) : (
								'N/A'
							)}
						</div>
					</div>
				</div>
			)}
		</Translate>
	);
};

TemplateConfirmation.propTypes = {
	selectedTemplate: PropTypes.object,
	templateResponse: PropTypes.object,
	templatePeers: PropTypes.array,
	templateCAs: PropTypes.array,
	templateOrderers: PropTypes.array,
};

export default TemplateConfirmation;
