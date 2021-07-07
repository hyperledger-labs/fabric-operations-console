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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { blue, yellow, red } from '@carbon/colors';
import { WarningFilled20, WarningAltFilled16 } from '@carbon/icons-react';
import { RadioTile, TileGroup } from 'carbon-components-react';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import DeployingIllustration from '../../../../assets/images/deploy_template_illos.svg';
import { Translate, withLocalize } from 'react-localize-redux';
import TranslateLink from '../../../TranslateLink/TranslateLink';
import TimelineCancelButton from '../../../TimelineCancelButton/TimelineCancelButton';
import _ from 'lodash';

class TemplateDeploying extends Component {
	learnMoreChange = topic => {
		this.props.updateState('gettingStartedModal', {
			topic,
		});
	};

	render() {
		const {
			cancelTemplateDeployment,
			currentDeploymentStep,
			messages,
			postTemplateError,
			recheckOrdererStatus,
			templateCAs,
			templateFile,
			templateName,
			templateMsps,
			templateOrderers,
			templatePeers,
			templateResponse,
			topic,
			totalDeploymentSteps,
			showResumeTemplateDeploymentMsg,
		} = this.props;
		return (
			<Translate>
				{({ translate }) => (
					<div className="ibp-template-deploying-section">
						<h2>
							{translate('deploying')} {templateFile ? templateFile.display_name : templateName ? templateName : ''}
						</h2>
						<div className="ibp-template-progress-container">
							<div className="ibp-template-progress-bar">
								<span
									className="ibp-template-progress-fill"
									style={{
										width: `calc((${currentDeploymentStep}% / ${totalDeploymentSteps}) * 100)`,
										backgroundColor: (postTemplateError && postTemplateError.error) || showResumeTemplateDeploymentMsg ? yellow : blue[50],
									}}
								/>
								<span className="ibp-template-progress-fill-background" />
							</div>
							{!showResumeTemplateDeploymentMsg &&
								(currentDeploymentStep && totalDeploymentSteps && _.isEmpty(postTemplateError) ? (
									<p className="ibp-template-progress-bar-label">
										<span>
											{translate('step')} {currentDeploymentStep} {translate('of')} {totalDeploymentSteps}
										</span>
										: <span>{messages[messages.length - 1]}</span>
									</p>
								) : (
									<div className="ibp-template-progress-error-message">
										<WarningFilled20
											style={{
												fill: red[50],
											}}
										/>
										<p
											className="ibp-template-progress-bar-label"
											style={{
												paddingBottom: '.25rem',
												paddingLeft: '.5rem',
											}}
										>
											{translate('template_orderer_timeout_message')}
										</p>
									</div>
								))}
							{!_.isEmpty(postTemplateError) && postTemplateError.error && postTemplateError.step === 'ordererHealth' && (
								<a onClick={() => recheckOrdererStatus(templateResponse)}
									className="ibp-link"
									href="/"
								>
									<Translate id="retry_orderer_status_check" />
								</a>
							)}
							{showResumeTemplateDeploymentMsg && (
								<div className="ibp-template-warning-message-container">
									<WarningAltFilled16 fill={yellow} />
									<p className="ibp-template-warning-message">{translate('template_requires_attention')}</p>
								</div>
							)}
						</div>
						<div className="ibp-template-component-learn-more-container">
							<div className="ibp-template-learn-options">
								<TileGroup
									name="learn_more_about"
									className="ibp-template-learn-more"
									onChange={this.learnMoreChange}
									valueSelected={'cas'}
									legend={translate('learn_more_about')}
								>
									<RadioTile value="cas"
										id="cas"
										name="ca_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('cas')}</p>
									</RadioTile>
									<RadioTile value="peers"
										id="peers"
										name="peer_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('peers')}</p>
									</RadioTile>
									<RadioTile value="orderers"
										id="orderers"
										name="orderer_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('orderers')}</p>
									</RadioTile>
									<RadioTile value="channels"
										id="channels"
										name="channel_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('channels')}</p>
									</RadioTile>
									<RadioTile value="chaincode"
										id="chaincode"
										name="chaincode_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('chaincode')}</p>
									</RadioTile>
									<RadioTile value="wallet"
										id="wallet"
										name="wallet_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('identities_in_wallet')}</p>
									</RadioTile>
									<RadioTile value="msps"
										id="msps"
										name="msps_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('orgs')}</p>
									</RadioTile>
									<RadioTile value="applications"
										id="applications"
										name="applications_educate"
										className="ibp-template-learn-more-ca"
									>
										<p>{translate('applications')}</p>
									</RadioTile>
								</TileGroup>
								<img src={DeployingIllustration}
									alt="Template deployment illustration"
									className="ibp-template-deploying-illustration"
								/>
							</div>
							{topic === 'cas' && (
								<>
									{templateCAs && (
										<p className="ibp-template-component-label">
											{translate('template_contains')} {templateCAs.length} {templateCAs.length === 1 ? translate('ca') : translate('cas')}
										</p>
									)}
									<h4 className="ibp-template-deploying-header">{translate('what_are_cas')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('ca_desc')}</p>
								</>
							)}
							{topic === 'peers' && (
								<>
									{templatePeers && (
										<p className="ibp-template-component-label">
											{translate('template_contains')} {templatePeers.length} {templatePeers.length === 1 ? translate('peer') : translate('peers')}
										</p>
									)}
									<h4 className="ibp-template-deploying-header">{translate('what_are_peers')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('peer_desc')}</p>
									<p className="ibp-template-learn-more-desc">{translate('peer_desc_2')}</p>
								</>
							)}
							{topic === 'orderers' && (
								<>
									{templateOrderers && (
										<p className="ibp-template-component-label">
											{`${translate('template_contains')} ${templateOrderers.length} ${
												templateOrderers.length === 1 ? translate('orderer') : translate('orderers')
											}`}
										</p>
									)}
									<h4 className="ibp-template-deploying-header">{translate('what_are_orderers')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('orderer_desc')}</p>
									<p className="ibp-template-learn-more-desc">{translate('orderer_desc_2')}</p>
									<p className="ibp-template-learn-more-desc">{translate('orderer_desc_3')}</p>
								</>
							)}
							{topic === 'channels' && (
								<>
									<h4 className="ibp-template-deploying-header">{translate('what_are_channels')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('channel_desc')}</p>
								</>
							)}
							{topic === 'chaincode' && (
								<>
									<h4 className="ibp-template-deploying-header">{translate('what_is_chaincode')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('chaincode_desc')}</p>
									<p className="ibp-template-learn-more-desc">{translate('chaincode_desc_2')}</p>
									<TranslateLink text="vs_code_extension_link"
										className="ibp-template-learn-more-link"
									/>
								</>
							)}
							{topic === 'wallet' && (
								<>
									<h4 className="ibp-template-deploying-header">{translate('what_are_identities')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('identity_desc')}</p>
									<p className="ibp-template-learn-more-desc">{translate('identity_desc_2')}</p>
								</>
							)}
							{topic === 'msps' && (
								<>
									{templateMsps && (
										<p className="ibp-template-component-label">
											{translate('template_contains')} {templateMsps.length} {templateMsps.length === 1 ? translate('org') : translate('orgs')}
										</p>
									)}
									<h4 className="ibp-template-deploying-header">{translate('what_are_orgs')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('msp_desc')}</p>
									<p className="ibp-template-learn-more-desc">{translate('msp_desc_2')}</p>
								</>
							)}
							{topic === 'applications' && (
								<>
									<h4 className="ibp-template-deploying-header">{translate('what_are_applications')}</h4>
									<p className="ibp-template-learn-more-desc">{translate('application_desc')}</p>
								</>
							)}
							{templateResponse.status === 'success' && (
								<TimelineCancelButton onClose={() => cancelTemplateDeployment()}
									closeMessage="cancel_channel_creation"
								/>
							)}
						</div>
					</div>
				)}
			</Translate>
		);
	}
}

const dataProps = {
	currentDeploymentStep: PropTypes.number,
	messages: PropTypes.array,
	postTemplateError: PropTypes.object,
	recheckOrdererStatus: PropTypes.func,
	templateFile: PropTypes.object,
	totalDeploymentSteps: PropTypes.number,
	topic: PropTypes.string,
	templateCAs: PropTypes.array,
	templatePeers: PropTypes.array,
	templateOrderers: PropTypes.array,
	templateMsps: PropTypes.array,
	templateName: PropTypes.string,
	templateIdentities: PropTypes.array,
	templateResponse: PropTypes.object,
	showResumeTemplateDeploymentMsg: PropTypes.bool,
};

TemplateDeploying.propTypes = {
	...dataProps,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state['gettingStartedModal'], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(TemplateDeploying));
