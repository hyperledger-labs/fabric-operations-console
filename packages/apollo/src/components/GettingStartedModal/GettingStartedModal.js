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

import CheckmarkFilled24 from '@carbon/icons-react/lib/checkmark--filled/24';
import ShoppingCart16 from '@carbon/icons-react/lib/shopping--cart/16';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { showError, showInfo, showSuccess, updateState } from '../../redux/commonActions';
import TemplateRestApi from '../../rest/TemplateRestApi';
import ActionsHelper from '../../utils/actionsHelper';
import FocusComponent from '../FocusComponent/FocusComponent';
import Helper from '../../utils/helper';
import { setInStorage } from '../../utils/localStorage';
import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import Timeline from '../Timeline/Timeline';
import DeveloperTemplate from './developer_template.json';
import EcosystemDiagram from './EcosystemDiagram';
import StarterTemplate from './starter_template.json';
import TemplateChoices from './Templates/TemplateChoices/TemplateChoices';
import TemplateConfirmation from './Templates/TemplateConfirmation/TemplateConfirmation';
import TemplateDeploying from './Templates/TemplateDeploying/TemplateDeploying';
import TemplateDetails from './Templates/TemplateDetails/TemplateDetails';

const SCOPE = 'gettingStartedModal';
const Log = new Logger(SCOPE);

const templateChoices = [
	{
		id: 'developer_template',
		complexity: 'simple',
		desc: 'template_dev_desc',
	},
	{
		id: 'starter_template',
		complexity: 'simple',
		desc: 'template_starter_desc',
	},
	// {
	// 	id: 'upload_custom_template',
	// 	subtext: 'upload_custom_template_tile_subtext',
	// 	complexity: 'complex',
	// 	desc: 'template_custom_desc',
	// },
];

class GettingStartedModal extends Component {
	duplicateObject = src => {
		return _.cloneDeep(src);
	};
	componentDidMount() {
		// make copies of developer and starter json files.
		const clonedDeveloperTemplate = this.duplicateObject(DeveloperTemplate);
		const clonedStarterTemplate = this.duplicateObject(StarterTemplate);
		this.handleStatusTimeout = 0;
		const body = document.querySelector('body');
		body.style.overflow = 'hidden';
		this.props.updateState('templateWrapper', {
			templateIsDeploying: false,
			templateIsDeployingChannel: false,
		});
		this.props.updateState(SCOPE, {
			originalDeveloperTemplate: DeveloperTemplate,
			originalStarterTemplate: StarterTemplate,
			developerTemplate: clonedDeveloperTemplate,
			starterTemplate: clonedStarterTemplate,
			selectedTemplate: templateChoices[0],
			viewingDiagram: true,
			viewingGetStartedOptions: false,
			viewingComponentTemplates: false,
			viewingTemplateConfirmation: false,
			templateFile: null,
			templateFileName: '',
			templateChoices: templateChoices,
			topic: 'cas',
			selectedGettingStartedOption: 'template',
			uploadingTemplateFile: false,
			templatePrefix: '',
			receivedPeerDetails: false,
			prefixHasBeenAdded: false,
			removingIdentities: false,
			cleaningUpIdentities: false,
			postTemplateError: {},
			timelineSteps: [
				[
					{
						groupSteps: [
							{
								label: 'select_template',
								onClick: this.showTemplateChoices,
								isLink: true,
							},
						],
					},
				],
				[
					{
						groupSteps: [
							{
								label: 'review_details',
								onClick: this.showTemplateDetails,
								isLink: true,
							},
						],
					},
				],
				[
					{
						groupSteps: [
							{
								label: 'confirm_deployment',
								onClick: this.showTemplateConfirmation,
								isLink: true,
							},
						],
					},
				],
			],
		});
		if (this.props.showTemplatePage) {
			this.props.updateState(SCOPE, {
				viewingDiagram: false,
				viewingGetStartedOptions: false,
				viewingComponentTemplates: true,
				selectedTimelineStep: {
					currentStepInsideOfGroupIndex: 0,
					currentStepIndex: 0,
				},
			});
		}
		if (this.props.templateIsDeploying || this.props.templateIsDeployingChannel) {
			Log.info('RESPONSE TO PASS TO CHECK STATUS: ', this.props.deployingTemplateData);
			this.props.updateState(SCOPE, {
				viewingDiagram: false,
				viewingGetStartedOptions: false,
				viewingComponentTemplates: false,
				viewingTemplateDetails: false,
				viewingTemplateConfirmation: false,
				templatePanelClosed: false,
			});
			this.props.updateState('templateWrapper', {
				templateIsDeploying: true,
			});
			this.pollTemplateStatus(this.props.deployingTemplateData);
		}
		if (this.props.showResumeTemplateDeploymentMsg) {
			this.props.updateState(SCOPE, {
				viewingDiagram: false,
				viewingGetStartedOptions: false,
				viewingComponentTemplates: false,
				viewingTemplateDetails: false,
				viewingTemplateConfirmation: false,
				templatePanelClosed: false,
			});
		}
	}

	componentWillUnmount() {
		const body = document.querySelector('body');
		body.style.overflow = 'auto';
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: false,
			viewingComponentTemplates: false,
			viewingTemplateDetails: false,
			templateFile: null,
			templateFileName: '',
			templatePanelClosed: true,
		});
		if (this.handleStatusTimeout) {
			clearTimeout(this.handleStatusTimeout);
			this.handleStatusTimeout = 0;
			Log.info('CLEARED STATUS TIMEOUT FROM TEMPLATE PANEL');
		}
	}

	onSubmit = () => {
		return new Promise(resolve => {
			setInStorage('showDiagram', false);
			resolve(this.props.onComplete());
		});
	};

	onPrefixChange = event => {
		const templatePrefix = event.target.value;
		this.props.updateState('gettingStartedModal', {
			templatePrefix,
		});
	};

	onPrefixUpdate = () => {
		this.props.updateState(SCOPE, {
			prefixHasBeenAdded: true,
		});
		// Add prefix to display names on text input blur
		const { templateFile, templatePrefix } = this.props;
		// we need to make another 'deep' copy of the json template file here,
		// otherwise weird things will happen when trying to reset because it will
		// try to use the original template json
		const templateFileCopy = this.duplicateObject(templateFile);
		Log.info('NEW TEMPLATE FILE COPY: ', templateFileCopy);
		const create_components = templateFileCopy && templateFileCopy.create_components;
		let componentsToRename = [];
		if (templatePrefix.length) {
			create_components.forEach(component => {
				if (
					(component && component.type === 'fabric-peer') ||
					(component && component.type === 'fabric-orderer') ||
					(component && component.type === 'fabric-ca') ||
					(component && component.type === 'msp')
				) {
					Log.info('THIS COMPONENT HAS A DISPLAY/CLUSTER NAME', component);
					if (component.type === 'fabric-orderer') {
						Log.info('CLUSTER NAME: ', component.display_name);
						component.cluster_name = `${templatePrefix} ${component.cluster_name}`;
						Log.info(component);
						componentsToRename.push(component);
					} else {
						Log.info('DISPLAY NAME: ', component.display_name);
						component.display_name = `${templatePrefix} ${component.display_name}`;
						Log.info(component);
						componentsToRename.push(component);
					}
				} else {
					Log.info('ENROLL IDS: ', component);
					componentsToRename.push(component);
				}
			});
			Log.info('COMPONENTS TO RENAME ARRAY: ', componentsToRename);
			if (componentsToRename.length) {
				let updatedTemplateFile = {
					...templateFileCopy,
					create_components: componentsToRename,
				};
				this.validateTemplate(updatedTemplateFile, '');
			}
		}
	};

	renderDiagram(translate) {
		const { viewingDiagram, viewingGetStartedOptions, viewingComponentTemplates } = this.props;
		if (viewingGetStartedOptions || viewingComponentTemplates) {
			return;
		}
		if (viewingDiagram) {
			return (
				<>
					<div className="ibp-template-header-container">
						<h1 className="ibp-template-header ibp--template-full-page-header">{translate('welcome_to_ibp')}</h1>
						<p className="ibp-modal-desc ibp-welcome-desc">{translate('welcome_desc_1')}</p>
					</div>
					<EcosystemDiagram />
				</>
			);
		}
	}

	renderTemplateGettingStarted(translate) {
		const { showResumeTemplateDeploymentMsg, viewingDiagram, viewingGetStartedOptions, viewingComponentTemplates } = this.props;
		if (showResumeTemplateDeploymentMsg || viewingDiagram || viewingComponentTemplates) {
			return;
		}
		if (viewingGetStartedOptions) {
			return (
				<>
					<div className="ibp-template-header-container">
						<h1 className="ibp-template-header ibp--template-full-page-header">{translate('choose_getting_started')}</h1>
						<p className="ibp-getting-started-desc">{translate('getting_started_desc')}</p>
					</div>
					<div className="ibp-getting-started-container">
						<button
							className={`ibp-getting-started-large-tile ${this.props.selectedGettingStartedOption === 'template' ? 'ibp-getting-started-option-active' : ''}`}
							onClick={() => this.setSelectedGettingStartedOption('template')}
						>
							<h3 className="ibp-getting-started-header">{translate('deploy_component_template')}</h3>
							<p className="ibp-getting-started-description">{translate('deploy_component_desc')}</p>
							<p className="ibp-getting-started-est-time">
								{translate('time_to_network')} {translate('template_est_time')}
							</p>
							<CheckmarkFilled24 className="ibp-getting-started-button-checkmark" />
						</button>
						<button
							className={`ibp-getting-started-large-tile ${this.props.selectedGettingStartedOption === 'standard' ? 'ibp-getting-started-option-active' : ''}`}
							onClick={() => this.setSelectedGettingStartedOption('standard')}
						>
							<h3 className="ibp-getting-started-header">{translate('build_network')}</h3>
							<p className="ibp-getting-started-description">{translate('build_network_template_desc')}</p>
							<p className="ibp-getting-started-est-time">
								{translate('time_to_network')} {translate('standard_est_time')}
							</p>
							<CheckmarkFilled24 className="ibp-getting-started-button-checkmark" />
						</button>
					</div>
				</>
			);
		}
	}

	setSelectedTemplate = chosenTemplate => {
		this.props.updateState(SCOPE, {
			selectedTemplate: chosenTemplate,
		});
	};

	clearTemplateFile = () => {
		this.props.updateState(SCOPE, {
			templateFile: null,
			templateFileName: '',
		});
	};

	validateTemplate = (templateJson, fileName) => {
		TemplateRestApi.validate(templateJson)
			.then(response => {
				const templateComponents = response.resp.resolved_components;
				Log.info(templateComponents);
				Log.info(response);
				const msps = templateComponents.filter(component => component.type === 'msp');
				const peers = templateComponents.filter(component => component.type === 'fabric-peer');
				const certificateAuthorities = templateComponents.filter(component => component.type === 'fabric-ca');
				const orderers = templateComponents.filter(component => component.type === 'fabric-orderer');
				const enrollIds = templateComponents.filter(component => component.type === 'enroll_id');
				this.props.updateState(SCOPE, {
					templatePrefix: '',
					templateResponse: response,
					templateFile: templateJson,
					templateFileName: fileName,
					templateMsps: msps,
					templatePeers: peers,
					templateCAs: certificateAuthorities,
					templateOrderers: orderers,
					templateEnrollIds: enrollIds,
					error: null,
					uploadingTemplateFile: false,
				});
			})
			.catch(error => {
				Log.info(error);
				this.props.updateState(SCOPE, {
					error: {
						title: 'error_incorrect_template_json',
					},
					uploadingTemplateFile: false,
				});
			});
	};

	onTemplateFileAdded = template => {
		this.props.updateState(SCOPE, {
			uploadingTemplateFile: true,
		});
		Log.info('TEMPLATE FILE: ', template);
		const templateJSONFile = template[0];
		if (templateJSONFile && templateJSONFile.type === 'application/json') {
			const readFile = new FileReader();
			readFile.onload = e => {
				const contents = e.target.result;
				const parsedTemplateJSONFile = JSON.parse(contents);
				const fileName = template[0].name;
				this.validateTemplate(parsedTemplateJSONFile, fileName);
			};
			readFile.readAsText(templateJSONFile);
		} else {
			this.props.updateState(SCOPE, {
				error: {
					title: 'error_unsupported_template_file_type',
				},
				uploadingTemplateFile: false,
			});
		}
	};

	renderTemplateChoices() {
		const { showResumeTemplateDeploymentMsg, viewingDiagram, viewingGetStartedOptions, viewingComponentTemplates } = this.props;
		if (showResumeTemplateDeploymentMsg || viewingDiagram || viewingGetStartedOptions) {
			return;
		}
		if (viewingComponentTemplates) {
			return (
				<TemplateChoices
					templateChoices={this.props.templateChoices}
					selectedTemplate={this.props.selectedTemplate}
					setSelectedTemplate={this.setSelectedTemplate}
				/>
			);
		}
	}

	renderTemplateTimeline(translate) {
		const {
			viewingDiagram,
			viewingGetStartedOptions,
			viewingComponentTemplates,
			viewingTemplateDetails,
			viewingTemplateConfirmation,
			selectedTimelineStep,
			showResumeTemplateDeploymentMsg,
			onClose,
			timelineSteps,
		} = this.props;
		if (viewingDiagram || viewingGetStartedOptions || showResumeTemplateDeploymentMsg) {
			return;
		}
		if (viewingComponentTemplates || viewingTemplateDetails || viewingTemplateConfirmation) {
			return (
				<Timeline
					steps={timelineSteps}
					onClose={onClose}
					selectedTimelineStep={selectedTimelineStep}
					header={translate('deploy_component_template')}
					estTime={translate('ten_min_setup')}
					progressWithChecks={true}
				/>
			);
		}
	}

	renderTemplateDetails = () => {
		const { showResumeTemplateDeploymentMsg, viewingDiagram, viewingGetStartedOptions, viewingComponentTemplates, viewingTemplateDetails } = this.props;
		const isStarterTemplate = this.props.selectedTemplate && this.props.selectedTemplate.id === 'starter_network' ? true : false;
		if (viewingDiagram || viewingGetStartedOptions || viewingComponentTemplates || showResumeTemplateDeploymentMsg) {
			return;
		}
		if (viewingTemplateDetails) {
			return (
				<TemplateDetails
					selectedTemplate={this.props.selectedTemplate}
					onTemplateFileAdded={this.onTemplateFileAdded}
					uploading={this.props.uploading}
					successfulUpload={this.props.successfulUpload}
					uploadingTemplateFile={this.props.uploadingTemplateFile}
					templateFile={this.props.templateFile}
					templateFileName={this.props.templateFileName}
					clearTemplateFile={this.clearTemplateFile}
					templatePeers={this.props.templatePeers}
					templateCAs={this.props.templateCAs}
					templateOrderers={this.props.templateOrderers}
					templateMsps={this.props.templateMsps}
					templateEnrollIds={this.props.templateEnrollIds}
					isStarterTemplate={isStarterTemplate}
					exportTemplateFile={this.exportTemplateFile}
					onPrefixUpdate={this.onPrefixUpdate}
					onPrefixChange={this.onPrefixChange}
					resetPrefix={this.resetPrefix}
					templatePrefix={this.props.templatePrefix}
					prefixHasBeenAdded={this.props.prefixHasBeenAdded}
				/>
			);
		}
	};

	exportTemplateFile = event => {
		const isStarterTemplate = this.props.selectedTemplate.id === 'starter_network' ? true : false;
		this.props.updateState(SCOPE, {
			downloadingTemplateFile: false,
		});
		const downloadLink = event.target;
		const templateFile =
			'text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(isStarterTemplate ? this.props.starterTemplate : this.props.developerTemplate));
		downloadLink.setAttribute('download', isStarterTemplate ? 'starter_template.json' : 'developer_template.json');
		downloadLink.setAttribute('href', `data:${templateFile}`);
	};

	renderTemplateConfirmation = () => {
		const {
			showResumeTemplateDeploymentMsg,
			viewingDiagram,
			viewingGetStartedOptions,
			viewingComponentTemplates,
			viewingTemplateDetails,
			viewingTemplateConfirmation,
		} = this.props;
		if (viewingDiagram || viewingGetStartedOptions || viewingComponentTemplates || viewingTemplateDetails || showResumeTemplateDeploymentMsg) {
			return;
		}
		if (viewingTemplateConfirmation) {
			return (
				<TemplateConfirmation
					selectedTemplate={this.props.selectedTemplate}
					templateResponse={this.props.templateResponse}
					templatePeers={this.props.templatePeers}
					templateCAs={this.props.templateCAs}
					templateOrderers={this.props.templateOrderers}
				/>
			);
		}
	};

	renderTemplateDeploying = () => {
		const {
			cancelTemplateDeployment,
			currentDeploymentStep,
			totalDeploymentSteps,
			viewingDiagram,
			viewingGetStartedOptions,
			viewingComponentTemplates,
			viewingTemplateDetails,
			viewingTemplateConfirmation,
			messages,
			postTemplateError,
			showResumeTemplateDeploymentMsg,
			templateIsDeploying,
			topic,
			templateFile,
			templateCAs,
			templatePeers,
			templateOrderers,
			templateMsps,
			templateName,
			templateIdentities,
			templateResponse,
			templateIsDeployingChannel,
		} = this.props;
		if (viewingDiagram || viewingGetStartedOptions || viewingComponentTemplates || viewingTemplateDetails || viewingTemplateConfirmation) {
			return;
		}
		if (templateIsDeploying || templateIsDeployingChannel || showResumeTemplateDeploymentMsg) {
			return (
				<TemplateDeploying
					cancelTemplateDeployment={cancelTemplateDeployment}
					templateFile={templateFile}
					currentDeploymentStep={currentDeploymentStep}
					totalDeploymentSteps={totalDeploymentSteps}
					messages={messages}
					topic={topic}
					templateCAs={templateCAs}
					templatePeers={templatePeers}
					templateOrderers={templateOrderers}
					templateMsps={templateMsps}
					templateName={templateName}
					templateIdentities={templateIdentities}
					postTemplateError={postTemplateError}
					templateResponse={templateResponse}
					recheckOrdererStatus={this.recheckOrdererStatus}
					showResumeTemplateDeploymentMsg={showResumeTemplateDeploymentMsg}
				/>
			);
		}
	};

	setFocus = () => {
		// set focus to first item on step
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	};

	showDiagram = () => {
		this.props.updateState(SCOPE, {
			viewingDiagram: true,
			viewingGetStartedOptions: false,
			viewingComponentTemplates: false,
			viewingTemplateDetails: false,
			viewingTemplateConfirmation: false,
		});
		this.setFocus();
	};

	showGettingStartedChoices = () => {
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: true,
			viewingComponentTemplates: false,
			viewingTemplateDetails: false,
			viewingTemplateConfirmation: false,
		});
		this.setFocus();
	};

	showTemplateChoices = () => {
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: false,
			viewingComponentTemplates: true,
			viewingTemplateDetails: false,
			viewingTemplateConfirmation: false,
			selectedTimelineStep: {
				currentStepInsideOfGroupIndex: 0,
				currentStepIndex: 0,
			},
			templateFile: null,
		});
		this.setFocus();
	};

	showTemplateDetails = () => {
		const isStarter = this.props.selectedTemplate.id === 'starter_network' ? true : false;
		if (this.props.selectedTemplate.id === 'starter_network' || this.props.selectedTemplate.id === 'developer_template') {
			Log.info('Developer template: ', this.props.developerTemplate);
			this.validateTemplate(isStarter ? this.props.starterTemplate : this.props.developerTemplate, '');
		}
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: false,
			viewingComponentTemplates: false,
			viewingTemplateDetails: true,
			viewingTemplateConfirmation: false,
			selectedTimelineStep: {
				currentStepInsideOfGroupIndex: 0,
				currentStepIndex: 1,
			},
		});
		this.setFocus();
	};

	resetPrefix = () => {
		const { templateFile, originalDeveloperTemplate, originalStarterTemplate, selectedTemplate } = this.props;
		Log.info('resetting to default template');
		const isStarter = selectedTemplate.id === 'starter_network' ? true : false;
		const noPrefixAdded = _.isEqual(isStarter ? originalStarterTemplate : originalDeveloperTemplate, templateFile);
		if (!noPrefixAdded) {
			this.props.updateState(SCOPE, {
				templatePrefix: '',
				prefixHasBeenAdded: false,
			});
			this.validateTemplate(isStarter ? originalStarterTemplate : originalDeveloperTemplate, '');
		} else {
			// prevent api request if there hasn't been a prefix added
			// no reason to reset if we already have the default template
			return;
		}
	};

	showTemplateConfirmation = () => {
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: false,
			viewingComponentTemplates: false,
			viewingTemplateDetails: false,
			viewingTemplateConfirmation: true,
			selectedTimelineStep: {
				currentStepInsideOfGroupIndex: 0,
				currentStepIndex: 2,
			},
		});
		this.setFocus();
	};

	setSelectedGettingStartedOption = option => {
		if (option === 'template') {
			this.props.updateState(SCOPE, {
				selectedGettingStartedOption: 'template',
			});
		} else if (option === 'standard') {
			this.props.updateState(SCOPE, {
				selectedGettingStartedOption: 'standard',
			});
		}
	};

	getButtons(translate) {
		const {
			showResumeTemplateDeploymentMsg,
			viewingDiagram,
			viewingGetStartedOptions,
			viewingComponentTemplates,
			viewingTemplateDetails,
			viewingTemplateConfirmation,
			templateIsDeploying,
		} = this.props;
		let buttons = [];
		if (viewingDiagram) {
			buttons.push({
				id: 'lets_get_started',
				text: translate('lets_get_started'),
				onClick:
					this.props.feature_flags && this.props.feature_flags.templates_enabled && ActionsHelper.canCreateComponent(this.props.userInfo)
						? this.showGettingStartedChoices
						: this.onSubmit,
			});
		}
		if (templateIsDeploying) {
			buttons.push({
				id: 'hide',
				text: translate('hide'),
				onClick: this.props.onClose,
			});
		}
		if (showResumeTemplateDeploymentMsg) {
			buttons.push(
				{
					text: translate('hide'),
					onClick: this.props.onClose,
				},
				{
					text: translate('resume_template_deployment'),
					onClick: this.props.resumeTemplateDeployment,
				}
			);
		}
		if (viewingGetStartedOptions && !showResumeTemplateDeploymentMsg) {
			buttons.push(
				{
					id: 'back',
					text: translate('back'),
					onClick: this.showDiagram,
				},
				{
					id: 'next',
					text: translate('next'),
					onClick: this.props.selectedGettingStartedOption === 'template' ? this.showTemplateChoices : this.props.onClose,
				}
			);
		}
		if (viewingComponentTemplates && !showResumeTemplateDeploymentMsg) {
			buttons.push(
				{
					id: 'back',
					text: translate('back'),
					onClick: this.showGettingStartedChoices,
				},
				{
					id: 'next',
					text: translate('next'),
					onClick: this.showTemplateDetails,
					type: 'submit',
				}
			);
		}
		if (viewingTemplateDetails && !showResumeTemplateDeploymentMsg) {
			buttons.push(
				{
					id: 'back',
					text: translate('back'),
					onClick: this.showTemplateChoices,
				},
				{
					id: 'next',
					text: translate('next'),
					onClick: this.showTemplateConfirmation,
					disabled: this.props.submitting,
					type: 'submit',
				}
			);
		}
		if (viewingTemplateConfirmation && !showResumeTemplateDeploymentMsg) {
			buttons.push(
				{
					id: 'back',
					text: translate('back'),
					onClick: this.showTemplateDetails,
				},
				{
					id: 'deploy_template',
					text: translate('deploy_template'),
					onClick: this.deployTemplate,
					disabled: !ActionsHelper.canCreateComponent(this.props.userInfo) && this.props.submitting,
					type: 'submit',
					icon: (
						<ShoppingCart16
							style={{
								fill: '#fff',
							}}
							className="ibp-template-deploy-submit-icon"
						/>
					),
				}
			);
		}
		return buttons;
	}

	pollTemplateStatus = () => {
		const { checkTemplateStatus } = this.props;
		checkTemplateStatus();
	};

	deployTemplate = () => {
		if (this.props.templateFile) {
			TemplateRestApi.build(this.props.templateFile)
				.then(response => {
					if (response.message === 'ok') {
						let url_path = response.poll_url;
						const pos = url_path.indexOf('/ak/api');
						if (pos >= 0) {
							// remove the "*/ak" part, don't have the auth for it
							url_path = url_path.substring(pos + 3);
						}
						this.props.updateState(SCOPE, {
							viewingTemplateConfirmation: false,
							deployingTemplateData: response,
						});
						this.props.updateState('templateWrapper', {
							activeTemplateUrl: url_path,
							templateIsDeploying: true,
							templateProgressBarIsClosed: false,
						});
						this.pollTemplateStatus(response);
					}
				})
				.catch(error => {
					Log.error(error);
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_deploying_template',
						},
					});
					this.props.updateState('templateWrapper', {
						templateIsDeploying: false,
					});
				});
		}
	};

	recheckOrdererStatus = templateResponse => {
		this.props.updateState(SCOPE, {
			postTemplateError: {
				error: false,
				step: '',
			},
		});
		this.props.getOrderingService(templateResponse);
	};

	render() {
		const translate = this.props.translate;
		return (
			<SidePanel
				id={
					this.props.viewingComponentTemplates || this.props.viewingTemplateDetails || this.props.viewingTemplateConfirmation
						? 'ibp--template-full-page-side-panel'
						: 'ibp--template-side-panel-container'
				}
				closed={this.props.onClose}
				onSubmit={this.onSubmit}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				submitButtonLabel={translate('lets_get_started')}
				buttons={this.getButtons(translate)}
				diagramWizard
				error={this.props.error}
				verticalPanel
			>
				<FocusComponent setFocus={this.props.setFocus}>
					{this.renderDiagram(translate)}
					{this.renderTemplateGettingStarted(translate)}
					{this.renderTemplateChoices(translate)}
					{this.renderTemplateDetails(translate)}
					{this.renderTemplateTimeline(translate)}
					{this.renderTemplateConfirmation(translate)}
					{this.renderTemplateDeploying(translate)}
				</FocusComponent>
			</SidePanel>
		);
	}
}

const dataProps = {
	activeTemplateUrl: PropTypes.string,
	activeItem: PropTypes.string,
	activeTextItem: PropTypes.string,
	deployingTemplateData: PropTypes.object,
	error: PropTypes.string,
	selectedTemplate: PropTypes.object,
	viewingDiagram: PropTypes.bool,
	viewingGetStartedOptions: PropTypes.bool,
	viewingComponentTemplates: PropTypes.bool,
	viewingTemplateDetails: PropTypes.bool,
	viewingTemplateConfirmation: PropTypes.bool,
	messages: PropTypes.array,
	selectedGettingStartedOption: PropTypes.string,
	showTemplatePage: PropTypes.bool,
	templateFile: PropTypes.object,
	templateFileName: PropTypes.string,
	templateMsps: PropTypes.array,
	templatePeers: PropTypes.array,
	templateCAs: PropTypes.array,
	templateOrderers: PropTypes.array,
	templateEnrollIds: PropTypes.array,
	templateChoices: PropTypes.array,
	templateIsDeploying: PropTypes.bool,
	timelineSteps: PropTypes.array,
	templateResponse: PropTypes.object,
	templateName: PropTypes.string,
	templatePanelClosed: PropTypes.bool,
	topic: PropTypes.string,
	selectedTimelineStep: PropTypes.object,
	uploadingTemplateFile: PropTypes.bool,
	currentDeploymentStep: PropTypes.number,
	totalDeploymentSteps: PropTypes.number,
	templatePrefix: PropTypes.string,
	developerTemplate: PropTypes.object,
	starterTemplate: PropTypes.object,
	originalDeveloperTemplate: PropTypes.object,
	originalStarterTemplate: PropTypes.object,
	templateIdentities: PropTypes.array,
	templateIsDeployingChannel: PropTypes.bool,
	ordererNotAvailable: PropTypes.bool,
	deployingChannelError: PropTypes.bool,
	receivedPeerDetails: PropTypes.bool,
	prefixHasBeenAdded: PropTypes.bool,
	removingIdentities: PropTypes.bool,
	cleaningUpIdentities: PropTypes.bool,
	postTemplateError: PropTypes.object,
	checkTemplateStatus: PropTypes.func,
	getOrderingService: PropTypes.func,
	showResumeTemplateDeploymentMsg: PropTypes.bool,
	resumeTemplateDeployment: PropTypes.func,
	setFocus: PropTypes.bool,
};

GettingStartedModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['activeTemplateUrl'] = state['templateWrapper'] ? state['templateWrapper']['activeTemplateUrl'] : null;
		return newProps;
	},
	dispatch => {
		return {
			dispatch,
			...bindActionCreators(
				{
					showError,
					showInfo,
					showSuccess,
					updateState,
				},
				dispatch
			),
		};
	}
)(withLocalize(GettingStartedModal));
