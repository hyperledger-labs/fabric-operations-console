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
import { ContentSwitcher, InlineNotification, SkeletonPlaceholder, Switch } from 'carbon-components-react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Trans, withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { showError, updateState } from '../../redux/commonActions';
import ChannelApi from '../../rest/ChannelApi';
import { EventsRestApi } from '../../rest/EventsRestApi';
import { MspRestApi } from '../../rest/MspRestApi';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Helper from '../../utils/helper';
import FileUploader from '../FileUploader/FileUploader';
import Form from '../Form/Form';
import ImportantBox from '../ImportantBox/ImportantBox';
import Logger from '../Log/Logger';
import SidePanelWarning from '../SidePanelWarning/SidePanelWarning';
import SVGs from '../Svgs/Svgs';
import TranslateLink from '../TranslateLink/TranslateLink';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';

const SCOPE = 'chaincodeModal';
const Log = new Logger(SCOPE);

// Common component used for instantiating OR Upgrading chaincode, depending on arguments passed.
// If installedChaincode is passed as argument, it is instantiating the chaincode.
// If instantiatedChaincode is passed instead, it is upgrading the chaincode.
class InstantiateChaincodeModal extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			loading: true,
			error: null,
			step: 1,
			collectionConfig: null,
			fileName: null,
			selectedMembers: [],
			peers: [],
			isEndorsementPolicySimple: true,
			selectedEndorsementCount: 1,
			showOrdererDropdown: false,
			msps: [],
		});
		this.isUpgradingChaincode();
		this.getMsps();
	}

	setError(error) {
		this.props.updateState(SCOPE, { error });
		this.props.updateState('wizard', { error });
	}

	isUpgradingChaincode() {
		let isUpgrade = this.props.instantiatedChaincode ? true : false;
		this.props.updateState(SCOPE, {
			isUpgrade: isUpgrade,
		});
		if (isUpgrade) {
			this.getAllowedUpgradeVersions();
		}
	}

	componentWillUnmount() {
		this.props.updateState(SCOPE, {
			isUpgrade: false,
			error: null,
			selectedChannel: null,
			selectedPeer: null,
			selectedOrderer: null,
			selectedArguments: null,
			parsedArguments: null,
			selectedFunction: null,
			dropdownEndorsementCount: null,
		});
	}

	getAllOrderers = () => {
		OrdererRestApi.getOrderers()
			.then(orderers => {
				this.props.updateState(SCOPE, {
					orderers,
				});
				this.getAllChannels();
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, { loading: false });
			});
	};

	getMsps = () => {
		MspRestApi.getAllMsps()
			.then(msps => {
				this.props.updateState(SCOPE, {
					msps,
				});
			})
			.catch(error => {
				Log.error(error);
			})
			.finally(() => {
				this.getAllOrderers();
			});
	};

	getAllChannels = () => {
		ChannelApi.getAllChannels()
			.then(channelResp => {
				let channels = channelResp.channels;
				if (channelResp.errors) {
					channelResp.errors.forEach(error => {
						if (error.message_key) {
							this.props.showError(error.message_key, { peerName: error.name }, SCOPE);
						} else {
							this.props.showError('error_peer_channels', { peerName: error.name }, SCOPE);
						}
					});
				}
				let selectedChannel = null;
				let allowed_channels = [];

				if (this.props.isUpgrade) {
					selectedChannel = channels.find(channel => channel.id === this.props.instantiatedChaincode.channel);
					allowed_channels = [selectedChannel];
				} else {
					let notInstantiatedChannels = this.getNotInstantiatedChannels(channels); // Channels on which smart contract is not yet instantiated
					let installed_peers = this.props.installedChaincode.peers.map(peer => peer.id); // All peers that have this smart contract installed
					allowed_channels = notInstantiatedChannels.filter(channel => {
						// Channel whose peer(s) have this smart contract installed
						let channel_peers = channel.peers.map(peer => peer.id);
						let isInstalledOnPeer = false;
						channel_peers.forEach(channel_peer => {
							if (installed_peers.includes(channel_peer)) {
								isInstalledOnPeer = true;
							}
						});
						return isInstalledOnPeer;
					});
					if (allowed_channels.length > 0) {
						selectedChannel = allowed_channels[0];
					}
				}
				// remove channels without ordererAddresses... typically these are bad channels with access issues...
				channels = _.filter(channels, channel => channel.ordererAddresses);
				channels.forEach(channel => {
					let samenamechannel = channels.find(x => x.id === channel.id && _.xor(x.ordererAddresses, channel.ordererAddresses).length);
					if (samenamechannel) {
						channel.name = channel.name + ' (' + channel.orderers[0].cluster_name + ')';
					}
				});
				this.props.updateState(SCOPE, {
					channels,
					allowed_channels,
					selectedChannel,
				});
				if (selectedChannel) {
					this.getChannelMembers(selectedChannel);
				} else {
					this.props.updateState(SCOPE, {
						members: [],
						selectedMembers: [],
						loading: false,
					});
				}
			})
			.catch(error => {
				Log.error(error);
				this.props.updateState(SCOPE, {
					loading: false,
					channels: [],
					allowed_channels: [],
					selectedChannel: null,
				});
			});
	};

	onChannelSelect = option => {
		if (option.selectedChannel.capability.application.indexOf('V2') === 0) {
			this.setError({ title: 'instantiate_not_allowed_20' });
			return;
		}
		let installed_peers = this.props.installedChaincode.peers.map(peer => peer.id); // All peers that have this smart contract installed
		let isInstalledOnPeer = false;
		let channel_peers = option.selectedChannel.peers.map(peer => peer.id);
		channel_peers.forEach(channel_peer => {
			if (installed_peers.includes(channel_peer)) {
				isInstalledOnPeer = true;
			}
		});

		if (!isInstalledOnPeer) {
			this.setError({ title: 'no_smart_contract_installed' });
		} else {
			let isInstantiationAllowed = false;
			this.props.allowed_channels.forEach(channel => {
				const selectedChannelPeers = option.selectedChannel.peers.map(peer => peer.id);
				const allowedChannelPeers = channel.peers.map(peer => peer.id);
				if (channel.name === option.selectedChannel.name && _.xor(selectedChannelPeers, allowedChannelPeers).length === 0) {
					isInstantiationAllowed = true;
				}
			});
			if (!isInstantiationAllowed) {
				this.setError({ title: 'already_instantiated_on_channel' });
			} else {
				this.setError(null);
				this.getChannelMembers(option.selectedChannel);
			}
		}
	};

	getAllowedUpgradeVersions = () => {
		let allowed_upgrade_versions = [];
		this.props.installedChaincodeList.forEach((installedCc, index) => {
			if (installedCc.name === this.props.instantiatedChaincode.name && installedCc.version !== this.props.instantiatedChaincode.version) {
				allowed_upgrade_versions.push({
					name: installedCc.version,
				});
			}
		});
		this.props.updateState(SCOPE, {
			versions: allowed_upgrade_versions,
		});
	};

	getMemberDisplayName(org) {
		let name = org;
		this.props.msps.forEach(msp => {
			if (msp.msp_id === org) {
				name = msp.name + ' (' + msp.msp_id + ')';
			}
		});
		return name;
	}

	getChannelMembers = option => {
		let peerId = option.peers[0].id;
		const selectedOrderer = option.orderers && option.orderers.length ? option.orderers[0] : null;
		const showOrdererDropdown = !selectedOrderer;
		ChannelApi.getChannelConfig(peerId, option.id)
			.then(config_envelop => {
				let config = config_envelop.config;
				let members = [];
				let orgNodes = config.channel_group.groups_map.Application.groups_map;
				let orgs = Object.keys(orgNodes);
				for (let i in orgs) {
					const orgNode = orgNodes[orgs[i]];
					const node_ou_enabled = _.get(orgNode, 'values_map.MSP.value.fabric_node_ous.enable');
					const peer_ou = _.get(orgNode, 'values_map.MSP.value.fabric_node_ous.peer_ou_identifier.organizational_unit_identifier');
					const role = node_ou_enabled && peer_ou && peer_ou === 'peer' ? 'peer' : 'member';
					const name = this.getMemberDisplayName(orgs[i]);
					members.push({
						id: orgs[i],
						org: orgs[i],
						role,
						name,
					});
				}
				const data = {
					selectedMembers: [...members],
				};

				let payload = {
					members,
					...data,
					showOrdererDropdown,
					loading: false,
				};

				if (!showOrdererDropdown) {
					payload.selectedOrderer = selectedOrderer;
				}

				this.props.updateState(SCOPE, payload);
				this.simpleFormChanged(data, true, { name: 'selectedMembers' });
			})
			.catch(error => {
				this.props.updateState(SCOPE, {
					members: [],
					selectedMembers: [],
					showOrdererDropdown: true,
					loading: false,
				});
			});
	};

	populatePeers = () => {
		return new Promise((resolve, reject) => {
			let installed_peers; //peers on which chaincode is installed
			if (this.props.isUpgrade) {
				this.props.installedChaincodeList.forEach((installedCc, index) => {
					if (installedCc.name === this.props.instantiatedChaincode.name) {
						installed_peers = installedCc.peers.map(peer => peer.id);
					}
				});
			} else {
				installed_peers = this.props.installedChaincode.peers.map(peer => peer.id);
			}

			let installed_channel_peers = []; // channel peers on which chaincode is installed
			this.props.selectedChannel.peers.forEach(peer => {
				if (installed_peers && installed_peers.includes(peer.id)) {
					installed_channel_peers.push(peer);
				}
			});
			let consenterUrl;
			if (_.has(this.props.selectedOrderer, 'raft') && this.props.selectedChannel.ordererAddresses) {
				// Use the orderer node that is in the channel consenter set
				const orderer = this.props.selectedOrderer.raft.find(x => this.props.selectedChannel.ordererAddresses.includes(_.toLower(x.backend_addr)));
				consenterUrl = orderer.url2use;
			}
			if (this.props.isUpgrade && this.props.instantiatedChaincode.peers.length) {
				let opts = {
					peerId: this.props.instantiatedChaincode.peers[0].id,
					orderer_host: consenterUrl ? consenterUrl : this.props.selectedOrderer.url2use,
					channel_id: this.props.instantiatedChaincode.channel,
					chaincode_id: this.props.instantiatedChaincode.name,
				};
				ChannelApi.getChaincodeDetailsFromPeer(opts.peerId, opts.orderer_host, opts.channel_id, opts.chaincode_id)
					.then(resp => {
						let policyIdentities = _.get(resp, 'instantiationPolicy.identities');
						let policyMembers = policyIdentities && policyIdentities.length ? policyIdentities.map(identity => {
							// identity.principal returns a Uint8Array
							let decodedIdentity = new TextDecoder().decode(identity.principal);
							// regex to just keep the plaintext id from the decodedIdentity since it includes unicode characters
							let rx = /\w+/g;
							return rx.exec(decodedIdentity)[0];
						}) : [];
						let filtered_peers = [];
						installed_channel_peers.forEach(peer => {
							if (policyMembers.includes(peer.msp_id)) {
								filtered_peers.push(peer);
							}
						});
						this.props.updateState(SCOPE, {
							peers: filtered_peers.length ? filtered_peers : installed_channel_peers,
							selectedPeer: filtered_peers.length ? filtered_peers[0] : installed_channel_peers.length ? installed_channel_peers[0] : null,
						});
						resolve();
					})
					.catch(error => {
						this.props.updateState(SCOPE, {
							peers: installed_channel_peers,
							selectedPeer: installed_channel_peers.length ? installed_channel_peers[0] : null,
						});
					});
			} else {
				this.props.updateState(SCOPE, {
					peers: installed_channel_peers,
					selectedPeer: installed_channel_peers.length ? installed_channel_peers[0] : null,
				});
				resolve();
			}
		});
	};

	buildEndorsementPolicy = data => {
		let endorsementCnt = data.selectedEndorsementCount || 1;
		let selectedMembers = data.selectedMembers || [];
		let endorsementPolicy = {
			identities: [],
			policy: {},
		};
		const label = endorsementCnt + '-of';
		endorsementPolicy.policy[label] = [];
		selectedMembers.forEach(member => {
			endorsementPolicy.identities.push({
				role: {
					name: member.role,
					mspId: member.id,
				},
			});
			endorsementPolicy.policy[label].push({
				'signed-by': endorsementPolicy.identities.length - 1,
			});
		});
		this.props.updateState(SCOPE, {
			selectedEndorsementPolicy: endorsementPolicy,
		});
	};

	/* 	things that should pass:
								-> []					- 0th step
			null				-> []					- 0th step
			"test"				-> ["test"]				- 1st and 6th step
			test				-> ["test"]				- 3rd step
			9					-> ["9"]				- 1st and 5th step
			"9"					-> ["9"]				- 1st and 5th step
			true				-> ["true"]				- 1st and 5th step
			{"hi":"there"}	-> ["{\"hi\":\"there\"}"]	- 2nd step
			{"hi":"there", "buddy":"pal"} 	-> 			- 2nd step
			[0,9]				-> ["[0,9]"]			- 2nd step
			66, 77				-> ["66","77"]			- 2nd step
			abc, test			-> ["abc","test"]		- 3rd step
			"test", "test"		-> ["test","test"]		- 2nd step
			"abc", 100			-> ["abc","100"]		- 2nd step
			["asdf", 9]			-> ["[\"asdf\",9]"]		- 2nd step
			{"hi":"hey, there"}	-> ["{\"hi\":\"hey, there\"}"]	- 2nd step
			"hey, there", "buddy" -> ["hey, there","buddy"]		- 2nd step
			"v","1,0,0", {"a,b.e":"test,101"} -> ["v","1,0,0","{\"a,b.e\":\"test,101\"}"] - 2nd step
			{"a":"b"}, [0,9], 1, "hi" -> ["{\"a\":\"b\"}","[0,9]","1","hi"]
			[0,9], hi 			-> ["[0,9]","hi"]		- THIS FAILS =(
	*/
	parseArguments = args => {
		let str = args.selectedArguments;
		if (str) {
			let ret;
			if (!str || str === 'null') {
				ret = [];
			} else {
				// ------------- First Pass --------------- //
				try {
					const temp = JSON.parse(str.toString()); //try the easy case
					if (typeof temp !== 'object') {
						ret = temp; //only use this one for strings/numeric, skip array/obj
					} else {
						throw Error('keep looking');
					}
				} catch (e) {
					try {
						ret = JSON.parse('[' + str.toString() + ']'); //now try if we can pretend its an array
					} catch (e) {
						const subFields = str.split(','); //so its not ready to be an array, lets split it all up
						ret = [];
						for (const x in subFields) {
							ret.push(subFields[x].trim());
						}
					}
				}

				// ------------- Second Pass --------------- //
				if (ret.constructor !== Array) {
					//not done, make it an array
					try {
						if (typeof ret === 'object') {
							//this is unreachable code
							ret = JSON.stringify(ret);
						} else {
							ret = JSON.parse('[' + ret.toString() + ']'); //now see if its ready to be an array
						}
					} catch (e) {
						ret = JSON.parse('["' + ret.toString() + '"]'); //last chance bucko
					}
				}

				// ----------- String Up The Argument Array ---------------- //
				for (const i in ret) {
					if (typeof ret[i] === 'object') {
						ret[i] = JSON.stringify(ret[i]);
					} else {
						ret[i] = ret[i].toString(); //every arg must be a string
					}
				}
			}

			if (ret.constructor !== Array) {
				//error out
				Log.error('error could not make it into array of strings');
				ret = [];
			}
			this.props.updateState(SCOPE, {
				parsedArguments: JSON.stringify(ret),
			});
		}
	};

	onSubmit = () => {
		if (
			!this.props.isUpgrade &&
			(!this.props.selectedChannel ||
				this.props.selectedChannel === 'select_channel_title' ||
				this.props.selectedChannel.peers.length < 1 ||
				!this.props.selectedPeer)
		) {
			this.props.showError('error_occurred_during_instantiation', {}, SCOPE);
		}
		if (this.props.isUpgrade && (!this.props.selectedVersion || !this.props.selectedPeer)) {
			this.props.showError('error_occurred_during_upgrade', {}, SCOPE);
		}

		// now find all consenting orderers on the channel and use them for retries
		let validOrdererUrls = [];
		if (this.props.selectedChannel && Array.isArray(this.props.selectedChannel.orderers)) {
			validOrdererUrls = this.props.selectedChannel.orderers.map(x => {
				return x.url2use;							// grab these urls
			});
		}

		return new Promise((resolve, reject) => {
			const body = {
				peerId: this.props.selectedPeer.id,
				orderer_hosts: validOrdererUrls,
				channel_id: this.props.isUpgrade ? this.props.instantiatedChaincode.channel : this.props.selectedChannel.id,
				chaincode_id: this.props.isUpgrade ? this.props.instantiatedChaincode.name : this.props.installedChaincode.name,
				chaincode_version: this.props.isUpgrade ? this.props.selectedVersion.name : this.props.installedChaincode.version,
				chaincode_args: this.props.parsedArguments ? JSON.parse(this.props.parsedArguments) : [],
				endorsement_policy: this.props.selectedEndorsementPolicy,
				static_collection_configs: this.props.collectionConfig,
				proposal_type: this.props.isUpgrade ? 'upgrade' : 'deploy',
				chaincode_function: this.props.selectedFunction,
			};
			Log.info('Request body for instantiating/upgrading chaincode:', body);

			ChannelApi.instantiateChaincode(body)
				.then(resp => {
					if (!resp.error) {
						// send async event... don't wait
						EventsRestApi.sendInstantiateCCEvent(body.chaincode_id, body.chaincode_version, body.channel_id);
						setTimeout(() => {
							if (this.props.isUpgrade) {
								this.props.onComplete(this.props.instantiatedChaincode.name, this.props.instantiatedChaincode.version, body.chaincode_version, body.channel_id);
							} else {
								this.props.onComplete(body.chaincode_id, body.chaincode_version, body.channel_id);
							}
							resolve();
						}, 5000);
					} else {
						reject({
							title: 'error_occurred_during_instantiation',
							details: resp,
						});
					}
				})
				.catch(error => {
					let msg = 'error_occurred_during_instantiation';
					if (error && error.grpc_resp && error.grpc_resp.statusMessage && error.grpc_resp.statusMessage.indexOf('signature set did not satisfy policy') >= 0) {
						msg = 'error_sync_channel';
					}
					EventsRestApi.sendInstantiateCCEvent(body.chaincode_id, body.chaincode_version, body.channel_id, 'error');
					reject({
						title: msg,
						details: error,
					});
				});
		});
	};

	onTogglePolicyType = () => {
		const isEndorsementPolicySimple = !this.props.isEndorsementPolicySimple;
		if (isEndorsementPolicySimple) {
			this.buildEndorsementPolicy(this.props);
			this.setError(null);
		} else {
			this.props.updateState(SCOPE, {
				advancedPolicy: JSON.stringify(this.props.selectedEndorsementPolicy, null, 4),
			});
		}
		this.props.updateState(SCOPE, {
			isEndorsementPolicySimple,
		});
	};

	// Return channels on which selected smart contract is not yet instantiated
	getNotInstantiatedChannels(all_channels) {
		let channels_with_smc = [];
		let allowed_channels = [];
		if (all_channels) {
			if (this.props.instantiatedChaincodeList) {
				this.props.instantiatedChaincodeList.forEach(icc => {
					if (icc.name === this.props.installedChaincode.name) {
						channels_with_smc.push({ name: icc.channel, peers: icc.peers.map(peer => peer.id) });
					}
				});
				if (channels_with_smc.length) {
					allowed_channels = all_channels.filter(channel => {
						let matchingchannel = channels_with_smc.find(x => {
							let peers = channel.peers.map(peer => peer.id);
							return x.name === channel.id && _.xor(x.peers, peers).length === 0;
						});
						return matchingchannel ? false : true;
					});
				} else {
					allowed_channels = all_channels;
				}
			}
		}
		return allowed_channels;
	}

	renderSelectChannel(translate) {
		if (this.props.isUpgrade && this.props.selectedOrderer) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={!this.props.isUpgrade ? translate('select_channel_title') : ''}
				tooltip={translate('select_channel_tooltip')}
				disableSubmit={
					!this.props.selectedChannel ||
					this.props.selectedChannel === 'select_channel_title' ||
					!_.has(this.props.selectedOrderer, 'url2use') ||
					this.props.error
				}
			>
				{this.props.orderers && this.props.channels && (
					<div>
						{!this.props.isUpgrade && (
							<Form
								scope={SCOPE}
								id={SCOPE + '-channel'}
								fields={[
									{
										name: 'selectedChannel',
										type: 'dropdown',
										default: 'select_channel_title',
										options: this.props.channels,
										disabled: this.props.isUpgrade,
									},
								]}
								onChange={this.onChannelSelect}
							/>
						)}
						{this.props.selectedChannel && this.props.showOrdererDropdown && (
							<div>
								{this.props.orderers && !!this.props.orderers.length && (
									<Form
										scope={SCOPE}
										id={SCOPE + '-orderer'}
										fields={[
											{
												name: 'selectedOrderer',
												type: 'dropdown',
												options: this.props.orderers,
											},
										]}
									/>
								)}
								{(!this.props.orderers || !this.props.orderers.length) && (
									<InlineNotification
										kind="error"
										title={translate('channel_orderer_not_found')}
										subtitle={translate('channel_orderer_not_found_desc')}
										hideCloseButton={true}
									/>
								)}
							</div>
						)}
						{this.props.selectedChannel !== 'select_channel_title' &&
							!this.props.showOrdererDropdown &&
							!_.has(this.props.selectedOrderer, 'url2use') &&
							!this.props.error && (
							<div className="ibp-modal-desc">
								<SidePanelWarning title={translate('channel_orderer_not_found')}
									subtitle={translate('channel_orderer_not_imported_desc')}
								/>
							</div>
						)}
					</div>
				)}
			</WizardStep>
		);
	}

	renderSelectUpgradeVersion(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title={translate('select_chaincode_version')}
				tooltip={translate('select_chaincode_version_tooltip')}
				disableSubmit={
					!this.props.selectedVersion || !_.has(this.props.selectedOrderer, 'url2use') || this.props.selectedChannel.capability.application.indexOf('V2') === 0
				}
			>
				<div id="ibp-chaincode-details-box"
					className="ibp-chaincode-details"
				>
					<div id="ibp-chaincode-title"
						className="ibp-instantiated-label"
					>
						{translate('instantiated')}
					</div>
					<div className="ibp-instantiated-name-version">
						<span id="ibp-contract-name"
							className="ibp-chaincode-name"
						>
							{this.props.instantiatedChaincode.name}
						</span>
						<span id="ibp-contract-version"
							className="ibp-chaincode-version"
						>
							{this.props.instantiatedChaincode.version}
						</span>
					</div>
				</div>

				<div id="ibp-chaincode-upgrade-box"
					className="ibp-chaincode-details"
				>
					<div id="ibp-upgrade-title"
						className="ibp-instantiated-label"
					>
						{translate('upgrade')}
					</div>
					<div className="ibp-instantiated-name-version">
						<span id="ibp-contract-choose-name"
							className="ibp-chaincode-name ibp-chaincode-upgrade-name"
						>
							{this.props.instantiatedChaincode.name}
						</span>
						<div className="ibp-chaincode-available-versions">
							<Form
								scope={SCOPE}
								id={SCOPE + '-version'}
								fields={[
									{
										name: 'selectedVersion',
										type: 'dropdown',
										options: this.props.versions,
										skipLabel: true,
									},
								]}
							/>
						</div>
					</div>
				</div>
				{!_.has(this.props.selectedOrderer, 'url2use') && (
					<div className="ibp-modal-desc">
						<SidePanelWarning title={translate('channel_orderer_not_found')}
							subtitle={translate('channel_orderer_not_imported_desc')}
						/>
					</div>
				)}
				{this.props.selectedChannel.capability.application.indexOf('V2') === 0 && (
					<div className="ibp-modal-desc">
						<SidePanelWarning title={translate('instantiate_not_allowed_20')} />
					</div>
				)}
			</WizardStep>
		);
	}

	renderSelectEndorsementPolicy(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title={translate('setup_endorsement_policy')}
				tooltip={translate('setup_endorsement_policy_tooltip')}
				desc={translate('setup_endorsement_policy_desc')}
				disableSubmit={!this.props.selectedMembers || this.props.selectedMembers.length === 0 || this.props.error}
				onNext={this.populatePeers}
			>
				<ContentSwitcher className="ibp-mode-toggle"
					onChange={this.onTogglePolicyType}
					selectedIndex={this.props.isEndorsementPolicySimple ? 0 : 1}
				>
					<Switch kind="button"
						id="ibp-endorsement-policy-simple"
						name="simple"
						text={translate('simple')}
					/>
					<Switch kind="button"
						id="ibp-endorsement-policy-advanced"
						name="advanced"
						text={translate('advanced')}
					/>
				</ContentSwitcher>
				{this.props.isEndorsementPolicySimple && this.renderSimplePolicy(translate)}
				{!this.props.isEndorsementPolicySimple && this.renderAdvancedPolicy(translate)}
			</WizardStep>
		);
	}

	renderSelectPeer(translate) {
		if (this.props.peers && this.props.peers.length === 1) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				title={translate('select_peer')}
				desc={translate(this.props.isUpgrade ? 'select_peer_desc_upgrade' : 'select_peer_desc_instantiate')}
				disableSubmit={!this.props.selectedPeer}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-peer'}
					fields={[
						{
							name: 'selectedPeer',
							type: 'dropdown',
							label: 'selected_peer',
							tooltip: this.props.isUpgrade ? 'select_peer_tooltip_upgrade' : 'select_peer_tooltip_instantiate',
							options: this.props.peers,
							required: true,
							loading: !this.props.peers || this.props.peers.length === 0,
						},
					]}
				/>
			</WizardStep>
		);
	}

	renderPDC(translate) {
		return (
			<WizardStep
				type="WizardStep"
				title={translate('setup_pdc')}
				tooltip={this.props.isUpgrade ? translate('setup_pdc_upgrade_tooltip') : translate('setup_pdc_tooltip')}
				desc={this.props.isUpgrade ? translate('setup_pdc_upgrade_desc') : translate('setup_pdc_desc')}
				disableSubmit={this.props.error}
			>
				{this.props.fileName && (
					<div className="ibp-json-file-details">
						<div className="ibp-json-file-name"
							id="chaincode-filename"
						>
							{this.props.fileName}
						</div>
						<div className="ibp-json-file-other-details">
							<div className="ibp-json-file-remove-icon"
								onClick={this.removeUploadedFile}
							>
								<SVGs type={'close'}
									width="10px"
									height="10px"
								/>
							</div>
						</div>
					</div>
				)}
				{!this.props.fileName && (
					<FileUploader
						labelDescription={translate('only_json')}
						buttonLabel={translate('add_file')}
						accept={['.json']}
						name="static_collection_configs"
						multiple={false}
						onChange={this.onUpload}
						id="static_collection_configs"
					/>
				)}
				<ImportantBox text="pdc_important_note"
					link="_PDC_DOC_LINK"
				/>
			</WizardStep>
		);
	}

	onUpload = event => {
		const file = event.target.files[0];
		const reader = new FileReader();
		let collectionConfig = null;
		this.setError(null);
		if (file) {
			reader.onload = e => {
				try {
					collectionConfig = JSON.parse(reader.result);
					if (!collectionConfig[0].policy) {
						this.setError({ title: 'error_auth_config_json' });
					}
					this.props.updateState(SCOPE, {
						collectionConfig,
						fileName: file.name,
					});
				} catch (e) {
					this.setError({ title: 'error_auth_config_json' });
				}
			};
			reader.readAsText(file);
		}
	};

	removeUploadedFile = () => {
		this.props.updateState(SCOPE, {
			collectionConfig: null,
			fileName: null,
			error: null,
		});
		this.props.updateState('wizard', { error: null });
	};

	simpleFormChanged = (data, valid, field) => {
		let selectedEndorsementCount;
		if (field.name === 'dropdownEndorsementCount') {
			selectedEndorsementCount = data.dropdownEndorsementCount.id;
			this.buildEndorsementPolicy({
				selectedMembers: this.props.selectedMembers,
				selectedEndorsementCount,
			});
			this.props.updateState(SCOPE, {
				selectedEndorsementCount,
			});
			return;
		}
		if (field.name === 'selectedMembers') {
			let endorsementCounts = [];
			let selectedEndorsementCount = this.props.selected || 1;
			if (data.selectedMembers && data.selectedMembers.length) {
				for (let i = 1; i <= data.selectedMembers.length; i++) {
					endorsementCounts.push({
						name: this.props.t('endorsement_policy', {
							count: i,
							total: data.selectedMembers.length,
						}),
						id: i,
					});
				}
				if (selectedEndorsementCount > data.selectedMembers.length) {
					selectedEndorsementCount = data.selectedMembers.length;
				}
			} else {
				selectedEndorsementCount = 1;
			}
			this.props.updateState(SCOPE, {
				endorsementCounts,
				selectedEndorsementCount,
				dropdownEndorsementCount: endorsementCounts[selectedEndorsementCount - 1],
			});
			this.buildEndorsementPolicy({
				...data,
				selectedEndorsementCount,
			});
		}
	};

	renderSimplePolicy(translate) {
		if (!this.props.members) {
			return;
		}
		const fields = [
			{
				name: 'selectedMembers',
				label: 'members',
				type: 'multiselect',
				tooltip: 'endorsement_policy_members',
				options: this.props.members,
				required: true,
				default: this.props.selectedMembers,
			},
		];
		if (this.props.selectedMembers && this.props.selectedMembers.length > 1 && this.props.endorsementCounts) {
			fields.push({
				name: 'dropdownEndorsementCount',
				label: 'policy',
				type: 'dropdown',
				tooltip: 'endorsement_policy_policy',
				options: this.props.endorsementCounts,
				default: this.props.endorsementCounts[this.props.selectedEndorsementCount - 1],
			});
		}
		return <Form scope={SCOPE}
			id={SCOPE + '-policy'}
			fields={fields}
			onChange={this.simpleFormChanged}
		/>;
	}

	renderAdvancedPolicy(translate) {
		if (!this.props.members) {
			return;
		}
		return (
			<div>
				<Form
					scope={SCOPE}
					id={`${SCOPE}-adv-policy-json-textarea`}
					fields={[
						{
							name: 'adv_policy_json',
							label: 'adv_policy_json',
							type: 'textarea',
							rows: 8,
							required: true,
							default: this.props.advancedPolicy,
						},
					]}
					onChange={this.retrievePolicyFromJson}
				/>
				<TranslateLink text="advanced_policy_reference"
					className="ibp__advanced-policy-learn-more"
				/>
			</div>
		);
	}

	renderEnterArguments(translate) {
		return (
			<WizardStep type="WizardStep"
				title={translate('enter_arguments')}
				desc={translate('enter_arguments_desc')}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-selected-args'}
					fields={[
						{
							name: 'selectedFunction',
							placeholder: 'enter_function_placeholder',
							tooltip: 'enter_function_tooltip',
						},
						{
							name: 'selectedArguments',
							tooltip: 'enter_arguments_field_tooltip',
							placeholder: 'arguments_placeholder',
						},
						/* { commented out based on user feedback(#683)
							name: 'parsedArguments',
							placeholder: 'arguments_placeholder',
							disabled: true,
						}, */
					]}
					onChange={(args, valid) => {
						this.parseArguments(args);
					}}
				/>
			</WizardStep>
		);
	}

	retrievePolicyFromJson = event => {
		try {
			let data = JSON.parse(event.target.value);
			let error_message;
			if (!data.identities) {
				error_message = 'error_identities_required';
			} else if (!data.policy) {
				error_message = 'error_policy_required';
			}
			this.setError(error_message ? { title: error_message } : null);
			this.props.updateState(SCOPE, {
				selectedEndorsementPolicy: data,
				advancedPolicy: JSON.stringify(data, null, 4),
			});
		} catch (err) {
			this.props.updateState(SCOPE, {
				advancedPolicy: event.target.value,
			});
			this.setError({ title: 'error_auth_config_json' });
			return;
		}
	};

	render() {
		const translate = this.props.t;
		return (
			<Wizard
				title={this.props.isUpgrade ? 'upgrade_smc' : 'instantiate_smc'}
				onClose={this.props.onClose}
				onSubmit={this.onSubmit}
				submitButtonLabel={this.props.isUpgrade ? translate('upgrade_smc') : translate('instantiate_smc')}
				error={this.props.error}
				loading={this.props.isUpgrade ? false : this.props.loading}
			>
				<p className="ibp-modal-desc">
					{this.props.isUpgrade ? (
						<>
							<Trans>{translate('upgrade_chaincode_desc_1', { name: this.props.instantiatedChaincode.name, channel: this.props.instantiatedChaincode.channel })}</Trans>
							<Trans>{translate('upgrade_chaincode_desc_2', { channel: this.props.instantiatedChaincode.channel })}</Trans>
							<Trans>{translate('upgrade_chaincode_desc_3')}</Trans>
						</>
					) : (
						translate('instantiate_chaincode_desc')
					)}
					<a
						className="ibp-link ibp-instantiate-link"
						href={
							this.props.isUpgrade
								? translate('upgrade_smart_contract_docs', { DOC_PREFIX: this.props.docPrefix })
								: translate('instantiate_smart_contract_docs', { DOC_PREFIX: this.props.docPrefix })
						}
						target="_blank"
						rel="noopener noreferrer"
					>
						{translate('find_out_more')}
					</a>
				</p>

				{!this.props.loading && this.renderSelectChannel(translate)}
				{!this.props.loading && this.props.isUpgrade && this.renderSelectUpgradeVersion(translate)}
				{!this.props.loading && this.renderSelectEndorsementPolicy(translate)}
				{!this.props.loading && this.renderSelectPeer(translate)}
				{!this.props.loading && this.renderPDC(translate)}
				{!this.props.loading && this.renderEnterArguments(translate)}
				{this.props.loading && (
					<SkeletonPlaceholder
						style={{
							width: '25rem',
							height: '2.5rem',
						}}
					/>
				)}
			</Wizard>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	error: PropTypes.string,
	step: PropTypes.number,
	isUpgrade: PropTypes.bool,
	isEndorsementPolicySimple: PropTypes.bool,
	installedChaincode: PropTypes.object,
	instantiatedChaincode: PropTypes.object,
	selectedChannel: PropTypes.object,
	selectedPeer: PropTypes.object,
	selectedOrderer: PropTypes.object,
	selectedMembers: PropTypes.array,
	selectedEndorsementCount: PropTypes.number,
	selectedArguments: PropTypes.string,
	selectedFunction: PropTypes.string,
	parsedArguments: PropTypes.string,
	advancedPolicy: PropTypes.object,
	selectedEndorsementPolicy: PropTypes.object,
	collectionConfig: PropTypes.array,
	selectedVersion: PropTypes.object,
	orderers: PropTypes.array,
	channels: PropTypes.array,
	peers: PropTypes.array,
	fileName: PropTypes.string,
	members: PropTypes.array,
	versions: PropTypes.array,
	endorsementCounts: PropTypes.array,
	installedChaincodeList: PropTypes.array,
	instantiatedChaincodeList: PropTypes.array,
	dropdownEndorsementCount: PropTypes.object,
	allowed_channels: PropTypes.array,
	showOrdererDropdown: PropTypes.bool,
	argsValid: PropTypes.bool,
	msps: PropTypes.array,
};

InstantiateChaincodeModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	showError: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['settings'] = state['settings'];
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo']['loggedInAs'] : null;
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
		showError,
	}
)(withTranslation()(InstantiateChaincodeModal));
