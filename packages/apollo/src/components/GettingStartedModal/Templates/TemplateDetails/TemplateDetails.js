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

import Close16 from '@carbon/icons-react/lib/close/16';
import JSON24 from '@carbon/icons-react/lib/JSON/24';
import { Button, InlineLoading, TextInput } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Translate, withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import DeveloperTemplateDiagram from '../../../../assets/images/developer_template_diagram.svg';
import StarterTemplateDiagram from '../../../../assets/images/starter_template_diagram.svg';
import { showError, updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import Dropzone from '../../../Dropzone/Dropzone';
import ImportantBox from '../../../ImportantBox/ImportantBox';
import Logger from '../../../Log/Logger';

const SCOPE = 'templateDetails';
const Log = new Logger(SCOPE);

class TemplateDetails extends Component {
	render() {
		const {
			selectedTemplate,
			onTemplateFileAdded,
			uploading,
			successfulUpload,
			uploadingTemplateFile,
			templateFile,
			templateFileName,
			clearTemplateFile,
			templatePeers,
			templateCAs,
			templateOrderers,
			templateMsps,
			templateEnrollIds,
			isStarterTemplate,
			// exportTemplateFile,
			onPrefixUpdate,
			templatePrefix,
			resetPrefix,
			onPrefixChange,
			prefixHasBeenAdded,
		} = this.props;
		Log.info('TEMPLATE PREFIX: ', templatePrefix);
		return (
			selectedTemplate && (
				<Translate>
					{({ translate }) => (
						<div className="ibp--selected-template-info-container">
							<h2 className="ibp-selected-template-header">
								{translate('review_details_of')} {translate(selectedTemplate.id === 'starter_network' ? 'starter_template' : 'developer_template')}
							</h2>
							<p className="ibp-selected-template-desc">
								{translate(selectedTemplate.id === 'starter_network' ? 'starter_network_desc' : '')}
								{translate(selectedTemplate.id === 'developer_template' ? 'developer_template_desc' : '')}
								{translate(selectedTemplate.id === 'upload_custom_template' ? 'custom_template_description' : '')}
							</p>
							<div className="ibp-template-detail-section">
								{selectedTemplate.id === 'upload_custom_template' && (
									<>
										{!templateFile && (
											<>
												<Dropzone
													className={`ibp--template-type-selectable-button ${
														selectedTemplate.id === 'upload_custom_template' ? 'ibp--custom-template-currently-selected' : ''
													}`}
													onFilesAdded={onTemplateFileAdded}
													disabled={uploading || successfulUpload}
													multi={false}
													acceptedFileTypes={['.json']}
												>
													<div className="ibp--custom-template-inner">
														<JSON24
															style={{
																fill: '#fff',
															}}
														/>
														{uploadingTemplateFile ? (
															<div className="ibp-template-uploading-container">
																<InlineLoading />
																<p className="ibp--custom-template-drag-desc">{translate('uploading_custom_template_subtext')}</p>
															</div>
														) : (
															<p className="ibp--custom-template-drag-desc">{translate('upload_custom_template_subtext')}</p>
														)}
													</div>
												</Dropzone>
											</>
										)}
										{templateFile && templateFile.display_name && (
											<>
												<div className="ibp--template-attached-container">
													<JSON24
														style={{
															fill: '#fff',
														}}
													/>
													<p className="ibp--template--attached-file-name">{templateFileName}</p>
													<Close16 onClick={() => clearTemplateFile()}
														className="ibp-template-remove-file-icon"
													/>
												</div>
												<h4>{translate('template_desc')}</h4>
												<p className="ibp-selected-template-desc">{templateFile && templateFile.description}</p>
												<div className="ibp-template-usage-table ibp-template-custom-component-table">
													<div className="ibp-template-usage-row">
														<div className="ibp-template-usage-row-header">{translate('component')}</div>
														<div className="ibp-template-usage-row-header">{translate('names')}</div>
													</div>
													<div className="ibp-template-usage-row">
														<div>
															{translate('peers')} ({templatePeers && templatePeers.length})
														</div>
														<div>
															{templatePeers.map((peer, index) => (
																<span key={peer.display_name}
																	className="ibp--uploaded-template-component-display-name"
																>
																	{peer.display_name}
																	{index !== templatePeers.length - 1 ? ', ' : ''}
																</span>
															))}
														</div>
													</div>
													<div className="ibp-template-usage-row">
														<div>
															{translate('cas')} ({templateCAs && templateCAs.length})
														</div>
														<div>
															{templateCAs.map((ca, index) => (
																<span key={ca.display_name}
																	className="ibp--uploaded-template-component-display-name"
																>
																	{ca.display_name}
																	{index !== templateCAs.length - 1 ? ', ' : ''}
																</span>
															))}
														</div>
													</div>
													<div className="ibp-template-usage-row">
														<div>
															{translate('orderers')} ({templateOrderers && templateOrderers.length})
														</div>
														<div>
															{templateOrderers.map((orderer, index) => (
																<span key={orderer.display_name}
																	className="ibp--uploaded-template-component-display-name"
																>
																	{orderer.cluster_name}
																	{index !== templateOrderers.length - 1 ? ', ' : ''}
																</span>
															))}
														</div>
													</div>
													<div className="ibp-template-usage-row">
														<div>
															{translate('msp')} ({templateMsps && templateMsps.length})
														</div>
														<div>
															{templateMsps.map((msp, index) => (
																<span key={msp.display_name}
																	className="ibp--uploaded-template-component-display-name"
																>
																	{msp.display_name}
																	{index !== templateMsps.length - 1 ? ', ' : ''}
																</span>
															))}
														</div>
													</div>
												</div>
											</>
										)}
									</>
								)}
								{(selectedTemplate.id === 'starter_network' || selectedTemplate.id === 'developer_template') && templateFile && (
									<>
										<small className="ibp-template-diagram-label">
											{translate(isStarterTemplate ? 'starter_template_diagram' : 'developer_template_diagram')}
										</small>
										<div className="ibp-template-diagram-container">
											<img
												src={isStarterTemplate ? StarterTemplateDiagram : DeveloperTemplateDiagram}
												alt="Template diagram"
												className="ibp-template-diagram-image"
											/>
										</div>
										<div className="ibp-timeline-details-prefix-container">
											<TextInput
												id="ibp-template-prefix-text-input"
												className="ibp-template-prefix-input"
												labelText={translate('template_prefix')}
												placeholder={translate('template_prefix_placeholder')}
												onChange={event => onPrefixChange(event)}
												value={templatePrefix}
												onBlur={() => onPrefixUpdate()}
											/>
											<Button onClick={() => resetPrefix()}
												kind={'ghost'}
												className="ibp-timeline-details-reset-button"
												disabled={!prefixHasBeenAdded}
											>
												{translate('clear_prefix')}
											</Button>
										</div>
										<div className="ibp-template-usage-table ibp-template-custom-component-table">
											<div className="ibp-template-usage-row">
												<div className="ibp-template-usage-row-header">{translate('component')}</div>
												<div className="ibp-template-usage-row-header">{translate('names')}</div>
											</div>
											<div className="ibp-template-usage-row">
												<div>
													{translate('peers')} ({templatePeers && templatePeers.length})
												</div>
												<div>
													{templatePeers.map((peer, index) => (
														<span key={peer.display_name}
															className="ibp--uploaded-template-component-display-name"
														>
															{peer.display_name}
															{index !== templatePeers.length - 1 ? ', ' : ''}
														</span>
													))}
												</div>
											</div>
											<div className="ibp-template-usage-row">
												<div>
													{translate('cas')} ({templateCAs && templateCAs.length})
												</div>
												<div>
													{templateCAs.map((ca, index) => (
														<span key={ca.display_name}
															className="ibp--uploaded-template-component-display-name"
														>
															{ca.display_name}
															{index !== templateCAs.length - 1 ? ', ' : ''}
														</span>
													))}
												</div>
											</div>
											<div className="ibp-template-usage-row">
												<div>
													{translate('orderers')} ({templateOrderers && templateOrderers.length})
												</div>
												<div>
													{templateOrderers.map((orderer, index) => (
														<span key={orderer.display_name}
															className="ibp--uploaded-template-component-display-name"
														>
															{orderer.cluster_name}
															{index !== templateOrderers.length - 1 ? ', ' : ''}
														</span>
													))}
												</div>
											</div>
											<div className="ibp-template-usage-row">
												<div>
													{translate('msp')} ({templateMsps && templateMsps.length})
												</div>
												<div>
													{templateMsps.map((msp, index) => (
														<span key={msp.display_name}
															className="ibp--uploaded-template-component-display-name"
														>
															{msp.display_name}
															{index !== templateMsps.length - 1 ? ', ' : ''}
														</span>
													))}
												</div>
											</div>
										</div>
									</>
								)}
								{templateFile && (
									<>
										<div className="ibp-template-usage-table ibp-template-custom-component-table">
											<div className="ibp-template-usage-row">
												<div className="ibp-template-usage-row-header">{translate('ca')}</div>
												<div className="ibp-template-usage-row-header">{translate('registered_users')}</div>
											</div>
											{templateCAs &&
												templateCAs.map(ca => (
													<div className="ibp-template-usage-row"
														key={ca.display_name}
													>
														<div>{ca.display_name}</div>
														<div>
															{templateEnrollIds.map(
																(enrollId, index) =>
																	enrollId.ca_name.substr(0, enrollId.ca_name.indexOf('.')) === ca._ref_id && (
																		<span className="ibp--uploaded-template-component-display-name"
																			key={enrollId.enroll_id}
																		>
																			{enrollId.enroll_id}
																			{index !== templateEnrollIds.length - 1 ? ', ' : ''}
																		</span>
																	)
															)}
														</div>
													</div>
												))}
										</div>
										{selectedTemplate.id === 'upload_custom_template' && (
											<ImportantBox text="template_component_identities"
												link="template_component_identities_link"
											/>
										)}
									</>
								)}
								{(selectedTemplate.id === 'starter_network' || selectedTemplate.id === 'developer_template') && (
									<>
										<ImportantBox text="template_component_identities"
											link="template_component_identities_link"
										/>
										{/* <a className="bx--btn bx--btn--tertiary"
											onClick={event => exportTemplateFile(event)}
											href="/download-template"
										>
											{translate('export_template_file')}
											<Download20 className="ibp-template-export-svg" />
										</a> */}
									</>
								)}
							</div>
						</div>
					)}
				</Translate>
			)
		);
	}
}

const dataProps = {
	selectedTemplate: PropTypes.object,
	onTemplateFileAdded: PropTypes.func,
	uploading: PropTypes.bool,
	successfulUpload: PropTypes.bool,
	uploadingTemplateFile: PropTypes.bool,
	templateFile: PropTypes.object,
	templateFileName: PropTypes.string,
	clearTemplateFile: PropTypes.func,
	templatePeers: PropTypes.array,
	templateCAs: PropTypes.array,
	templateOrderers: PropTypes.array,
	templateMsps: PropTypes.array,
	templateEnrollIds: PropTypes.array,
	templatePrefix: PropTypes.string,
	prefixHasBeenAdded: PropTypes.string,
	isStarterTemplate: PropTypes.bool,
	// exportTemplateFile: PropTypes.func,
	onPrefixUpdate: PropTypes.func,
	onPrefixChange: PropTypes.func,
	resetPrefix: PropTypes.func,
};

TemplateDetails.propTypes = {
	...dataProps,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		showError,
		updateState,
	}
)(withLocalize(TemplateDetails));
