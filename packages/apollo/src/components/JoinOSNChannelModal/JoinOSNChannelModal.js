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
import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import { OrdererRestApi } from '../../rest/OrdererRestApi';
import Helper from '../../utils/helper';
import Form from '../Form/Form';
import Logger from '../Log/Logger';
import Wizard from '../Wizard/Wizard';
import WizardStep from '../WizardStep/WizardStep';
import IdentityApi from '../../rest/IdentityApi';
import { ChannelParticipationApi } from '../../rest/ChannelParticipationApi';
import StitchApi from '../../rest/StitchApi';
import { Loading } from 'carbon-components-react';

const SCOPE = 'joinOSNChannelModal';
const Log = new Logger(SCOPE);

class JoinOSNChannelModal extends React.Component {
	async componentDidMount() {
		// if we need to get orderers....
		const oss = await OrdererRestApi.getOrderers(true);

		// build individual orderer node options
		const orderers = [];
		for (let i in oss) {
			for (let x in oss[i].raft) {
				const temp = JSON.parse(JSON.stringify(oss[i].raft[x]));
				temp.display_name = `[${oss[i].raft[x].cluster_name}] ${oss[i].raft[x].display_name}`;
				orderers.push(temp);
			}
		};
		console.log('dsh99 got orderers', orderers);

		this.props.updateState(SCOPE, {
			orderers,
			channels: [],
			disableSubmit: true,
			submitting: false,
		});
	}

	componentWillUnmount() {
		if (!this.props.isPending) {
			this.props.updateState(SCOPE, {
				config: null,
				selected_osn: null,
			});
		}
	}

	// get all the channels
	loadChannels = async (orderer) => {
		console.log('dsh99 loadChannels orderer', orderer);
		if (!orderer || !orderer.osnadmin_url) { return; }

		let orderer_tls_identity = await IdentityApi.getTLSIdentity(orderer);
		console.log('dsh99 orderer_tls_identity', orderer_tls_identity);

		if (orderer_tls_identity) {
			try {
				let all_identities = await IdentityApi.getIdentities();
				//console.log('dsh99 all_identities', all_identities);
				const channels = await ChannelParticipationApi._getChannels(all_identities, orderer);
				console.log('dsh99 awaited channels', channels);
				return channels;
			} catch (error) {
				console.log('dsh99 error', error);
				return [];
			}
		}
	};

	// selected orderer was changed
	changeOrderer = async (change) => {
		const orderer = change.orderer_joined;
		console.log('dsh99 selected orderer', orderer);
		const resp = await this.loadChannels(orderer);
		const channels = (resp && Array.isArray(resp.channels)) ? resp.channels : [];
		console.log('dsh99 channels', channels);
		this.props.updateState(SCOPE, {
			channels: channels,
			selected_osn: orderer,
		});
	};

	// selected channel was changed
	changeChannel = async (change) => {
		const channel = change.channel;
		console.log('dsh99 selected channel', channel);
		this.props.updateState(SCOPE, {
			config: null,
			loading: true
		});
		try {
			const config = await this.getChannelConfigBlock(channel.name);
			this.props.updateState(SCOPE, {
				config: config,
				loading: false,
			});
		} catch (e) {
			// dsh todo show error if we can't get the block
			this.props.updateState(SCOPE, {
				config: null,
				loading: false,
			});
		}
	};

	// get config block for the selected channel via the selected orderer
	getChannelConfigBlock = async (channel) => {
		console.log('dsh99 selected_osn', channel, this.props.selected_osn);
		let all_identities = await IdentityApi.getIdentities();
		const identity4tls = await ChannelParticipationApi.findMatchingIdentity({
			identities: all_identities,
			root_certs_b64pems: _.get(this.props.selected_osn, 'msp.tlsca.root_certs')
		});

		const opts = {
			msp_id: this.props.selected_osn.msp_id,
			client_cert_b64pem: identity4tls.cert,
			client_prv_key_b64pem: identity4tls.private_key,
			orderer_host: this.props.selected_osn.url2use,
			channel_id: channel,
			include_bin: true,
		};
		console.log('dsh99 get config opts', opts);
		const resp = await StitchApi.getChannelConfigWithRetry(opts, [this.props.selected_osn]);
		console.log('dsh99 config resp', resp);
		const config = window.stitch.uint8ArrayToBase64(resp.grpc_message);
		console.log('dsh99 config', config);
		return config;
	};

	// join the OSNs
	async onSubmit() {

	}

	// step 1
	renderSelectOrderer(translate) {
		if (!this.props.orderers) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				headerDesc={translate('join_osn_desc')}
				//title={translate('select_osn')}
				desc={translate('select_osn_desc')}
				tooltip={translate('select_orderer_tooltip')}
				disableSubmit={!this.props.config}
			>
				<Form
					scope={SCOPE}
					id={SCOPE + '-orderer'}
					fields={[
						{
							name: 'orderer_joined',
							type: 'dropdown',
							options: this.props.orderers,
							default: 'select_osn_placeholder',
							required: true,
						},
					]}
					onChange={this.changeOrderer}
				/>
				<Form
					scope={SCOPE}
					id={SCOPE + '-channels'}
					fields={[
						{
							name: 'channel',
							type: 'dropdown',
							options: this.props.channels,
							required: true,
							default: 'select_ch_placeholder',
							disabled: (!this.props.channels || this.props.channels.length === 0) ? true : false
						},
					]}
					onChange={this.changeChannel}
				/>
				{this.props.loading && <Loading withOverlay={false}
					className="ibp-wizard-loading"
				/>}
			</WizardStep>
		);
	}

	// step 2
	renderSelectJoiningOSNs(translate) {
		if (!this.props.orderers) {
			return;
		}
		return (
			<WizardStep
				type="WizardStep"
				headerDesc={translate('osn-join-desc')}
				//title={translate('select_osn')}
				//desc={translate('select_osn_desc')}
				//tooltip={translate('select_orderer_tooltip')}
				disableSubmit={!this.props.config}
			>
				hey there buddy
				{this.props.loading && <Loading withOverlay={false}
					className="ibp-wizard-loading"
				/>}
			</WizardStep>
		);
	}

	// main render
	render() {
		const translate = this.props.translate;
		return (
			<Wizard
				title="join_osn_channel_title"
				onClose={this.props.onClose}
				onSubmit={() => this.onSubmit()}
				showSubmitSpinner={this.props.submitting}
				submitButtonLabel={translate('join_channel')}
			>
				{this.renderSelectOrderer(translate)}
				{this.renderSelectJoiningOSNs(translate)}
			</Wizard>
		);
	}
}

const dataProps = {
	channel: PropTypes.string,
	pendingChannelName: PropTypes.string,
	submitting: PropTypes.bool,
	disableSubmit: PropTypes.bool,
	orderers: PropTypes.array,
	orderer: PropTypes.object,
	channel_orderer_addresses: PropTypes.array,
	hideChannelStep: PropTypes.bool,
	peer: PropTypes.any,
	selectedPeers: PropTypes.any,
	isPending: PropTypes.bool,
	loading: PropTypes.bool,
	channels: PropTypes.bool,
	selected_osn: PropTypes.object,
	config: PropTypes.object,
};

JoinOSNChannelModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['CRN'] = state['settings'] ? state['settings']['CRN'] : null;
		newProps['userInfo'] = state['userInfo'] ? state['userInfo']['loggedInAs'] : null;
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['docPrefix'] = state['settings'] ? state['settings']['docPrefix'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(withLocalize(JoinOSNChannelModal));
