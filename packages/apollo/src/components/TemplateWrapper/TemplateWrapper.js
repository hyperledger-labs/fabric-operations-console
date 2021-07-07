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
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Helper from '../../utils/helper';
import { showSuccess, showInfo, updateState } from '../../redux/commonActions';
import { InlineLoading } from 'carbon-components-react';
import { Translate, withLocalize } from 'react-localize-redux';
import GettingStartedModal from '../GettingStartedModal/GettingStartedModal';
import TemplateProgressBar from '../GettingStartedModal/Templates/TemplateProgressBar/TemplateProgressBar';
import TemplateRestApi from '../../rest/TemplateRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import IdentityApi from '../../rest/IdentityApi';
import uuidv4 from 'uuid/v4';
import Logger from '../Log/Logger';
import NodeStatus from '../../utils/status';
import ChannelApi from '../../rest/ChannelApi';
import { NodeRestApi } from '../../rest/NodeRestApi';
import { PeerRestApi } from '../../rest/PeerRestApi';
import { getFromStorage, setInStorage } from '../../utils/localStorage';
import * as constants from '../../utils/constants';

const SCOPE = 'templateWrapper';
const Log = new Logger(SCOPE);

class TemplateWrapper extends Component {
	componentDidMount() {
		this.handleStatusTimeout = 0;
		this.props.updateState(SCOPE, {
			templateIdentities: [],
			messages: [],
			currentDeploymentStep: 1,
			totalDeploymentSteps: 1,
			showDiagram: true,
			templateComplete: false,
			templateProgressBarIsClosed: true,
			showResumeTemplateDeploymentMsg: false,
		});
		const showDiagramFlag = getFromStorage('showDiagram');
		if (showDiagramFlag) {
			this.props.updateState(SCOPE, {
				showDiagram: showDiagramFlag,
			});
		} else {
			if (showDiagramFlag === false) {
				this.props.updateState(SCOPE, {
					showDiagram: showDiagramFlag,
				});
			} else {
				// showDiagram local storage is null
				// could be first time so we show the diagram
				setInStorage('showDiagram', true);
				this.props.updateState(SCOPE, {
					showDiagram: true,
				});
			}
		}
		TemplateRestApi.getStartedTemplates((err, resp) => {
			const allTemplates = resp;
			if (allTemplates) {
				const mostRecentTemplate = allTemplates.length ? allTemplates.reduce((prev, current) => (prev.ts_started > current.ts_started ? prev : current)) : '';
				if (this.props.userInfo.uuid === mostRecentTemplate.uuid) {
					const pollUrl = `${mostRecentTemplate.client_webhook_url}/api/v2/webhooks/txs/${mostRecentTemplate.tx_id}`;
					// 'The current user is the user who created this template'
					if (
						mostRecentTemplate.status === 'pending' ||
						(mostRecentTemplate.status === 'success' && mostRecentTemplate.channel_work.status !== 'success') ||
						(mostRecentTemplate.status === 'success' && mostRecentTemplate.channel_work.status === 'waiting')
					) {
						const builtComponents = Object.values(mostRecentTemplate.built);
						const msps = builtComponents.filter(component => component.type === 'msp');
						const peers = builtComponents.filter(component => component.type === 'fabric-peer');
						const certificateAuthorities = builtComponents.filter(component => component.type === 'fabric-ca');
						const orderers = builtComponents.filter(component => component.type === 'fabric-orderer');
						const enrollIds = builtComponents.filter(component => component.type === 'enroll_id');
						this.props.updateState(SCOPE, {
							templateProgressBarIsClosed: false,
							mostRecentTemplate,
							activeTemplateUrl: pollUrl,
							templateName: mostRecentTemplate.original_template.display_name,
							messages: mostRecentTemplate.athena_messages,
							postTemplateError: {},
							templateResponse: mostRecentTemplate,
							totalDeploymentSteps: mostRecentTemplate.athena_messages.length,
						});
						this.props.updateState('gettingStartedModal', {
							templateMsps: msps,
							templatePeers: peers,
							templateCAs: certificateAuthorities,
							templateOrderers: orderers,
							templateEnrollIds: enrollIds,
							topic: 'cas',
							viewingGetStartedOptions: false,
							viewingComponentTemplates: false,
							viewingTemplateDetails: false,
						});
						if (mostRecentTemplate.status === 'pending') {
							this.props.updateState(SCOPE, {
								templateIsDeploying: true,
								showDiagram: false,
								templateProgressBarIsClosed: false,
							});
							this.checkTemplateStatus();
						} else if (mostRecentTemplate.status === 'success' && mostRecentTemplate.channel_work.status !== 'success') {
							this.props.updateState(SCOPE, {
								showResumeTemplateDeploymentMsg: true,
							});
						}
					}
				}
			}
		});

		this.getIdentities();
	}

	componentDidUpdate(prevProps) {
		if (prevProps !== this.props) {
			if (this.props.showDiagram && this.props.templateIsDeploying) {
				// deploying with template panel open
				if (this.handleStatusTimeout) {
					clearTimeout(this.handleStatusTimeout);
					this.handleStatusTimeout = 0;
				}
			} else if (!this.props.showDiagram) {
				if (prevProps.templateComplete !== this.props.templateComplete) {
					if (this.props.templateComplete) {
						// finished deploying with template panel closed
						if (this.handleStatusTimeout) {
							clearTimeout(this.handleStatusTimeout);
							this.handleStatusTimeout = 0;
						}
						setTimeout(() => {
							this.props.updateState(SCOPE, {
								templateProgressBarIsClosed: true,
								templateComplete: false,
								templateIsDeploying: false,
								templateIsDeployingChannel: false,
							});
						}, 7000);
					}
				}
			}
		}
	}

	resumeTemplateDeployment = event => {
		event.preventDefault();
		this.props.updateState(SCOPE, {
			showResumeTemplateDeploymentMsg: false,
			currentDeploymentStep: this.props.mostRecentTemplate.on_step,
			totalDeploymentSteps: this.props.mostRecentTemplate.total_steps + 4,
			templateName: this.props.mostRecentTemplate.original_template.display_name,
		});
		if (this.props.mostRecentTemplate.status === 'success' && this.props.mostRecentTemplate.channel_work.status !== 'success') {
			this.props.updateState(SCOPE, {
				templateIsDeployingChannel: true,
			});
			this.associateTemplateComponents(this.props.mostRecentTemplate);
		}
	};

	getIdentities = () => {
		IdentityApi.getIdentities()
			.then(ids => {
				if (ids) {
					this.props.updateState(SCOPE, {
						consoleIdentities: ids,
					});
				}
			})
			.catch(error => {
				Log.info('error:', error);
			});
	};

	checkTemplateStatus = () => {
		const { activeTemplateUrl } = this.props;
		TemplateRestApi.checkTemplateStatus(activeTemplateUrl)
			.then(templateResponse => {
				if (templateResponse.status === 'pending') {
					this.props.updateState(SCOPE, {
						currentDeploymentStep: templateResponse.on_step,
						totalDeploymentSteps: templateResponse.total_steps + 4,
						templateName: templateResponse.original_template.display_name,
						messages: templateResponse.athena_messages,
					});
					this.handleStatusTimeout = setTimeout(() => {
						this.checkTemplateStatus();
						this.handleStatusTimeout = 0;
					}, 4000);
				} else if (templateResponse.on_step === templateResponse.total_steps && templateResponse.status === 'success') {
					this.associateTemplateComponents(templateResponse);
				} else if (templateResponse.status === 'error') {
					this.props.updateState(SCOPE, {
						error: {
							title: 'error_deploying_template',
						},
						templateIsDeploying: false,
					});
					this.props.updateState('gettingStartedModal', {
						viewingComponentTemplates: true,
						selectedTimelineStep: {
							currentGroupStepIndex: 0,
							currentStepIndex: 0,
						},
					});
				}
			})
			.catch(error => {
				Log.error(error);
			});
	};

	associateTemplateComponents = templateResponse => {
		this.props.updateState(SCOPE, {
			templateResponse: templateResponse,
		});
		for (let i in templateResponse.built) {
			const component = templateResponse.built[i];
			// if its an id, import
			if (component.type === 'enroll_id') {
				// iterate through nodes to find associations to use
				// converts object of objects to array of objects
				const componentsToAssociate = Object.values(templateResponse.processed_template);
				// creates a new array containing all of our nodes that need to be associated with an identity
				const templateNodes = componentsToAssociate.filter(e => e.type === 'fabric-peer' || e.type === 'fabric-orderer' || e.type === 'fabric-ca');
				const builtComponents = Object.values(templateResponse.built);
				// creates a new array containing all of our nodes that were built successfully
				const builtTemplateNodes = builtComponents.filter(e => e.type === 'fabric-peer' || e.type === 'fabric-orderer' || e.type === 'fabric-ca');
				// Log.info('Enroll id: ', component);
				if (templateNodes.length) {
					templateNodes.forEach((node, index) => {
						if (node._associated_enroll_id === component.display_name) {
							let wallet_name =
								this.props.templatePrefix && this.props.templatePrefix.length
									? `${this.props.templatePrefix} ${component.display_name} Admin`
									: `${component.display_name} Admin`;
							if (this.idIsTaken(component.display_name)) {
								wallet_name = `${component.display_name}_${uuidv4()} Admin`; // make something unique
							}
							const identity = {
								name: wallet_name,
								private_key: component.private_key,
								cert: component.cert,
								type: 'identity',
							};
							TemplateRestApi.createIdentities([identity]);
							this.props.updateState(SCOPE, {
								templateIdentities: this.props.templateIdentities.concat([identity]),
							});
							IdentityApi.associateComponent(wallet_name, node)
								.then(() => {
									// Only move on to channel creation process, after the last node has been iterated through/we have associated the last component
									if (index === builtTemplateNodes.length - 1) {
										const name = templateResponse.original_template.display_name;
										this.props.updateState(SCOPE, {
											templateName: name,
											templateIsDeploying: false,
											templateIsDeployingChannel: true,
											activeTemplateUrl: '',
										});
										this.getOrderingService(templateResponse);
										// this.startChannelCreationProcess();
									}
								})
								.catch(error => {
									Log.error('Error associating: ', error);
								});
						}
					});
				}
			}
		}
	};

	getOrderingService = templateResponse => {
		Log.info('We\'ve reached the consortium step.');
		this.props.updateState(SCOPE, {
			templateOrderers: [],
		});
		if (!this.props.messages.includes('Waiting for orderer to finish starting up.')) {
			this.props.updateState(SCOPE, {
				currentDeploymentStep: this.props.totalDeploymentSteps - 3,
				messages: this.props.messages.concat(['Waiting for orderer to finish starting up.']),
			});
		}
		const components = Object.values(templateResponse.built); // converts object of objects to array of objects
		const templateOrderingServices = components.filter(node => node.type === 'fabric-orderer'); // creates a new array containing all of our orderers
		const templateOrderer = templateOrderingServices[0];
		if (templateOrderingServices.length) {
			OrdererRestApi.getOrdererDetails(templateOrderer.id, true)
				.then(ordererDetail => {
					this.props.updateState(SCOPE, {
						templateOrderers: [ordererDetail],
					});
					this.checkOrdererHealth(ordererDetail, templateResponse);
				})
				.catch(error => {
					Log.error(error);
					this.props.updateState(SCOPE, {
						postTemplateError: {
							error: true,
							step: 'ordererHealth',
						},
					});
				});
		}
	};

	checkOrdererHealth(ordererService, templateResponse) {
		Log.info('Checking orderer health!');
		NodeStatus.getStatus(
			ordererService,
			SCOPE,
			'templateOrderers',
			(id, status) => {
				if (status === 'running') {
					NodeStatus.cancel();
					// start process to add MSPs to orderer
					this.addMspToOrderer(ordererService, templateResponse);
					this.props.updateState(SCOPE, {
						ordererNotAvailable: false,
						currentDeploymentStep: this.props.totalDeploymentSteps - 2,
						messages: this.props.messages.concat(['Adding organizations to consortium.']),
					});
				} else if (!status) {
					this.props.updateState(SCOPE, {
						postTemplateError: {
							error: true,
							step: 'ordererHealth',
						},
					});
				}
			},
			100,
			5000
		);
	}

	async addMspToOrderer(orderingService, templateResponse) {
		Log.info('Attempting to add all template msps to consortium');
		const mspIds = [];
		const components = Object.values(templateResponse.built); // converts object of objects to array of objects
		const templateMSPs = components.filter(node => node.type === 'msp'); // creates a new array containing all of our MSPs
		if (templateMSPs.length) {
			// trying to make this series of api calls sequentially
			for (const [index, msp] of templateMSPs.entries()) {
				mspIds.push(msp.msp_id);
				this.props.updateState(SCOPE, {
					channelMSPs: mspIds,
				});
				const mspPayload = {
					ordererId: orderingService.cluster_id,
					configtxlator_url: this.props.configtxlator_url,
					type: 'ordererMember',
					operation: 'add',
					payload: { ...msp },
				};
				const response = await OrdererRestApi.addMSP(mspPayload);
				if (response.message === 'ok' && index === templateMSPs.length - 1) {
					const updatedTemplateBody = {
						channel_work: {
							added2consortium: mspIds,
							channels: {},
							status: 'waiting',
						},
						status: 'success',
					};
					TemplateRestApi.updateTemplateStatus(templateResponse.tx_id, updatedTemplateBody)
						.then(() => {
							this.props.updateState(SCOPE, {
								currentDeploymentStep: this.props.totalDeploymentSteps - 1,
								messages: this.props.messages.concat(['Creating channel.']),
							});
							this.createChannel(response.orderer, templateMSPs[0], templateResponse);
						})
						.catch(error => {
							Log.error('We had trouble updating template webhook on the msp step', error);
						});
				}
			}
		}
	}

	createChannel = (orderingService, selected_msp, templateResponse) => {
		Log.info('Starting to create a channel!');
		let organizations = {};
		const selectedIdentity = this.props.templateIdentities[0];
		const components = Object.values(templateResponse.built); // converts object of objects to array of objects
		const selected_msps = components.filter(node => node.type === 'msp'); // creates a new array containing all of our MSPs
		selected_msps
			.filter(org => org.msp_id !== '')
			.forEach(org => {
				organizations[org.msp_id] = {
					msp_id: org.msp_id,
					roles: ['admin', 'writer', 'reader'],
					host_url: org.host_url,
					admins: org.admins,
				};
			});
		let options = {
			channel_id: 'channel1',
			org_msp_id: selected_msp.msp_id,
			application_msps: organizations,
			orderer_url: orderingService ? orderingService.url2use : null,
			client_cert_b64pem: selectedIdentity ? selectedIdentity.cert : null,
			client_prv_key_b64pem: selectedIdentity ? selectedIdentity.private_key : null,
			configtxlator_url: this.props.configtxlator_url,
			acls: {},
			application_capabilities:
				!this.props.selectedApplicationCapability || this.props.selectedApplicationCapability === 'select_capability'
					? [constants.DEFAULT_APPLICATION_CAPABILITY]
					: [this.props.selectedApplicationCapability.id], // Default is V1_3
			n_out_of: 1,
		};

		ChannelApi.createAppChannel(options)
			.then(resp => {
				const updatedTemplateBody = {
					channel_work: {
						added2consortium: this.props.channelMSPs ? this.props.channelMSPs : [],
						channels: {
							channel1: {
								created: Date.now(),
								peers_joined: [],
							},
						},
						status: 'waiting',
					},
					status: 'success',
				};
				TemplateRestApi.updateTemplateStatus(templateResponse.tx_id, updatedTemplateBody)
					.then(() => {
						this.props.updateState(SCOPE, {
							currentDeploymentStep: this.props.totalDeploymentSteps,
							messages: this.props.messages.concat(['Joining channel with peer.']),
						});
						this.getTemplatePeerDetails(orderingService, templateResponse, resp.channel);
						Log.debug('Channel was created successfully: ', resp);
					})
					.catch(error => {
						Log.error('We had trouble updating template webhook', error);
					});
			})
			.catch(error => {
				Log.error(error);
				let error_msg = 'error_create_channel';
				if (error && error.grpc_resp && error.grpc_resp.statusMessage) {
					if (
						error.grpc_resp.statusMessage.indexOf('but got version') !== -1 ||
						error.grpc_resp.statusMessage.indexOf('be at version 0, but it is currently at version 1') !== -1
					) {
						error_msg = 'channel_error_exists';
					}
					if (
						error.grpc_resp.statusMessage.indexOf('existing config does not contain element for') !== -1 ||
						error.grpc_resp.statusMessage.indexOf('Attempted to include a member which is not in the consortium') !== -1
					) {
						error_msg = 'channel_error_nomember';
					}
				}
				this.props.updateState(SCOPE, {
					submitting: false,
					createChannelError: {
						title: error_msg,
						details: error,
					},
				});
			});
	};

	getTemplatePeerDetails = (orderingService, templateResponse, channelName) => {
		Log.info('Getting template peer details.');
		this.props.updateState(SCOPE, {
			templatePeers: [], // empty templatePeers so we can populate it with the full details of each peer
		});
		const components = Object.values(templateResponse.built); // converts object of objects to array of objects
		const templatePeers = components.filter(e => e.type === 'fabric-peer'); // creates a new array containing all of our peers
		if (templatePeers.length) {
			templatePeers.forEach((peer, index) => {
				PeerRestApi.getPeerDetails(peer.id, true)
					.then(peerDetail => {
						this.props.updateState(SCOPE, {
							templatePeers: this.props.templatePeers.concat([peerDetail]),
						});
						if (index === templatePeers.length - 1) {
							// we will only get here if we've reached the last item/peer in the array of template peers
							this.props.updateState(SCOPE, {
								receivedPeerDetails: true,
							});
							// this.joinTemplateChannel(orderingService, channelName, templateResponse);
							this.checkPeerHealth(orderingService, this.props.templatePeers, templateResponse, channelName);
						}
					})
					.catch(error => {
						Log.error(error);
					});
			});
		}
	};

	checkPeerHealth(orderingService, templatePeers, templateResponse, channelName) {
		Log.info('Checking peer/s health!');
		NodeStatus.getStatus(
			templatePeers,
			SCOPE,
			'templatePeers',
			(id, status) => {
				if (status === 'running') {
					NodeStatus.cancel();
					// start join channel
					this.joinTemplateChannel(orderingService, channelName, templateResponse);
					this.props.updateState(SCOPE, {
						peersNotAvailable: false,
					});
				} else if (!status) {
					this.props.updateState(SCOPE, {
						postTemplateError: {
							error: true,
							step: 'peerHealth',
						},
					});
				}
			},
			100,
			5000
		);
	}

	joinTemplateChannel = (orderingService, channelName, templateResponse) => {
		Log.info('Making join channel request.');
		const { receivedPeerDetails, removingIdentities, templateName, templatePeers } = this.props;
		if (receivedPeerDetails && templatePeers.length) {
			PeerRestApi.joinChannel(templatePeers, orderingService, channelName)
				.then(() => {
					const updatedTemplateBody = {
						channel_work: {
							// added for Matt's channel work, used to track channel progress
							added2consortium: this.props.channelMSPs ? this.props.channelMSPs : [],
							channels: {
								channel1: {
									created: Date.now(),
									peers_joined: templatePeers,
								},
							},
							status: 'success',
						},
						status: 'success',
					};
					TemplateRestApi.updateTemplateStatus(templateResponse.tx_id, updatedTemplateBody)
						.then(response => {
							const customMessage = (
								<>
									<a onClick={event => this.exportIdentities(event, templateResponse)}
										className="ibp-template-download-identity-button ibp-link"
										href="/"
									>
										<Translate id="download_identities" />
									</a>
									{removingIdentities && <InlineLoading className="ibp-notification-icon-spin-relative" />}
								</>
							);
							Log.info('Join was successful.');
							this.props.updateState(SCOPE, {
								templateComplete: true,
							});
							this.props.showSuccess('template_deployed', { name: templateName }, SCOPE, 'template_deployed_desc');
							this.props.showInfo('template_identities_created', {}, SCOPE, 'template_identities_created_desc', false, false, customMessage);
							this.closeDiagramModal();
						})
						.catch(error => {
							Log.error('We had trouble updating template webhook', error);
						});
				})
				.catch(joinPeerError => {
					let error = joinPeerError.error;
					Log.error('joinPeerError', joinPeerError);
					let msg = 'error_join_failed';
					if (
						error &&
						error.grpc_resp &&
						error.grpc_resp.statusMessage &&
						(error.grpc_resp.statusMessage.indexOf('This identity is not an admin') !== -1 ||
							error.grpc_resp.statusMessage.indexOf('Failed verifying that proposal\'s creator satisfies local MSP principal') !== -1)
					) {
						msg = 'error_join_failed1';
					}
					if (error && error.grpc_resp && error.grpc_resp.statusMessage && error.grpc_resp.statusMessage.indexOf('already exists') > -1) {
						msg = 'error_already_joined';
					}
					if (error && error.grpc_resp && error.grpc_resp.statusMessage && error.grpc_resp.statusMessage.indexOf('contains no code or message') > -1) {
						msg = 'error_join_failed_no_response';
					}
					if (error && error.grpc_resp && error.grpc_resp.status === 404) {
						msg = 'error_join_channel_not_found';
					}
					this.props.updateState(SCOPE, {
						error: {
							title: msg,
							translateOptions: {
								peerName: joinPeerError ? (joinPeerError.peer ? joinPeerError.peer.display_name : '') : '',
							},
						},
						templateIsDeploying: false,
					});
				});
		}
	};

	exportIdentities = (event, templateResponse) => {
		event.preventDefault();
		const { cleaningUpIdentities, removingIdentities, templateIdentities } = this.props;
		const customMessage = (
			<>
				<a onClick={e => this.cleanUpIdentities(e, templateResponse)}
					className="ibp-template-download-identity-button ibp-link"
					href="/"
				>
					<Translate id="clean_up_identities" />
				</a>
				{cleaningUpIdentities && <InlineLoading className="ibp-notification-icon-spin-relative" />}
			</>
		);
		if (removingIdentities) {
			return;
		}
		this.props.updateState(SCOPE, {
			removingIdentities: true,
		});
		if (templateIdentities.length) {
			const node = {
				name: 'data',
				raft: templateIdentities,
			};
			Helper.exportNodesAsZip(node)
				.then(() => {
					this.props.updateState('notifications', {
						list: [],
					});
					this.props.updateState(SCOPE, {
						removingIdentities: false,
					});
					this.props.showInfo('template_clean_identities_msg', {}, SCOPE, 'template_clean_identities_msg_desc', false, false, customMessage);
				})
				.catch(error => {
					this.props.showError('error_downloading_enroll_ids', {}, SCOPE);
				});
		}
	};

	cleanUpIdentities = (event, templateResponse) => {
		event.preventDefault();
		const components = Object.values(templateResponse.built); // converts object of objects to array of objects
		const enrollIds = components.filter(e => e.type === 'enroll_id'); // creates a new array containing all of our enroll ids
		if (this.props.cleaningUpIdentities) {
			return;
		}
		this.props.updateState(SCOPE, {
			cleaningUpIdentities: true,
		});
		if (enrollIds.length) {
			enrollIds.forEach((enrollId, index) => {
				NodeRestApi.removeComponent(enrollId.id)
					.then(() => {
						Log.info('successfully deleted enroll id');
						if (index === enrollIds.length - 1) {
							Log.info('Finished deleting the last enroll id');
							this.props.updateState('notifications', {
								list: [],
							});
							this.props.updateState(SCOPE, {
								cleaningUpIdentities: false,
							});
							this.props.showInfo('template_identities_msg', {}, SCOPE, 'template_identities_msg_desc', true, false);
						}
					})
					.catch(error => {
						Log.error('there was a problem deleting your enroll id: ', error);
						this.props.showError('error_removing_enroll_ids', {}, SCOPE);
					});
			});
		}
	};

	clearTemplateProgressBar = () => {
		this.props.updateState(SCOPE, {
			templateIsDeploying: false,
			templateIsDeployingChannel: false,
			templateComplete: true,
		});
	};

	idIsTaken = enrollId => {
		if (enrollId) {
			const enrollIdIsTaken = this.props.consoleIdentities.filter(id => id.name === enrollId);
			if (enrollIdIsTaken.length) {
				return true;
			} else {
				return false;
			}
		}
	};

	showTemplate = page => {
		if (page === 'templatePage') {
			this.props.updateState(SCOPE, {
				showDiagram: true,
				showTemplatePage: true,
			});
			if (this.props.showResumeTemplateDeploymentMsg) {
				this.props.updateState(SCOPE, {
					currentDeploymentStep: this.props.mostRecentTemplate.on_step,
					totalDeploymentSteps: this.props.mostRecentTemplate.total_steps + 4,
					templateName: this.props.mostRecentTemplate.original_template.display_name,
				});
			}
		}
	};

	openDiagramModal = () => {
		this.props.updateState(SCOPE, {
			showDiagram: true,
		});
	};

	closeDiagramModal = () => {
		this.props.updateState(SCOPE, {
			showDiagram: false,
		});
	};

	cancelTemplateDeployment = () => {
		const { templateResponse } = this.props;
		const updatedTemplateBody = {
			channel_work: {
				added2consortium: [],
				channels: {},
				status: 'success',
			},
			status: 'success',
		};
		TemplateRestApi.updateTemplateStatus(templateResponse.tx_id, updatedTemplateBody)
			.then(() => {
				this.props.updateState(SCOPE, {
					messages: [],
					templateComplete: true,
					templateIsDeploying: false,
					templateIsDeployingChannel: false,
					showResumeTemplateDeploymentMsg: false,
					templateProgressBarIsClosed: true,
				});
				this.closeDiagramModal();
			})
			.catch(error => {
				Log.error('We had trouble updating template webhook on the cancel template step.', error);
			});
	};

	render() {
		return (
			<>
				{this.props.showDiagram && (
					<GettingStartedModal
						cancelTemplateDeployment={this.cancelTemplateDeployment}
						onClose={this.closeDiagramModal}
						onComplete={this.closeDiagramModal}
						showTemplatePage={this.props.showTemplatePage}
						currentDeploymentStep={this.props.currentDeploymentStep}
						totalDeploymentSteps={this.props.totalDeploymentSteps}
						templateName={this.props.templateName}
						messages={this.props.messages}
						templateResponse={this.props.templateResponse}
						templateIsDeploying={this.props.templateIsDeploying}
						templateIsDeployingChannel={this.props.templateIsDeployingChannel}
						templateIdentities={this.props.templateIdentities}
						error={this.props.error}
						viewingComponentTemplates={this.props.viewingComponentTemplates}
						selectedTimelineStep={this.props.selectedTimelineStep}
						templateOrderers={this.props.templateOrderers}
						postTemplateError={this.props.postTemplateError}
						ordererNotAvailable={this.props.ordererNotAvailable}
						deployingChannelError={this.props.deployingChannelError}
						submitting={this.props.submitting}
						createChannelError={this.props.createChannelError}
						templatePeers={this.props.templatePeers}
						receivedPeerDetails={this.props.receivedPeerDetails}
						peersNotAvailable={this.props.peersNotAvailable}
						templateComplete={this.props.templateComplete}
						removingIdentities={this.props.removingIdentities}
						cleaningUpIdentities={this.props.cleaningUpIdentities}
						checkTemplateStatus={this.checkTemplateStatus}
						getOrderingService={this.getOrderingService}
						showResumeTemplateDeploymentMsg={this.props.showResumeTemplateDeploymentMsg}
						resumeTemplateDeployment={this.resumeTemplateDeployment}
					/>
				)}
				{!this.props.showDiagram &&
					(this.props.templateIsDeploying || this.props.templateIsDeployingChannel || this.props.showResumeTemplateDeploymentMsg) &&
					!this.props.templateProgressBarIsClosed && (
					<TemplateProgressBar
						templateName={this.props.templateName}
						currentDeploymentStep={this.props.currentDeploymentStep}
						totalDeploymentSteps={this.props.totalDeploymentSteps}
						showTemplate={this.showTemplate}
						clearProgress={this.clearTemplateProgressBar}
						templateComplete={this.props.templateComplete}
						showResumeTemplateDeploymentMsg={this.props.showResumeTemplateDeploymentMsg}
						resumeTemplateDeployment={this.resumeTemplateDeployment}
					/>
				)}
			</>
		);
	}
}

const dataProps = {
	showDiagram: PropTypes.bool,
	activeTemplateUrl: PropTypes.string,
	activeItem: PropTypes.string,
	activeTextItem: PropTypes.string,
	consoleIdentities: PropTypes.array,
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
	templateComplete: PropTypes.bool,
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
	channelMSPs: PropTypes.array,
	mostRecentTemplate: PropTypes.object,
	showResumeTemplateDeploymentMsg: PropTypes.bool,
};

TemplateWrapper.propTypes = {
	...dataProps,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['templatePrefix'] = state['gettingStartedModal'] ? state['gettingStartedModal']['templatePrefix'] : null;
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['deployingTemplateData'] = state['gettingStartedModal'] ? state['gettingStartedModal']['deployingTemplateData'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	{
		showSuccess,
		showInfo,
		updateState,
	}
)(withLocalize(TemplateWrapper));
