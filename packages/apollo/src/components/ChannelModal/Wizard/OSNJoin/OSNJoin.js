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

import _ from 'lodash';
import { InlineNotification } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import Helper from '../../../../utils/helper';
import StitchApi from '../../../../rest/StitchApi';
import ConfigBlockApi from '../../../../rest/ConfigBlockApi';
import SVGs from '../../../Svgs/Svgs';
import { Loading } from 'carbon-components-react';

const SCOPE = 'channelModal';
let timer = null;

// This is step "osn_join_channel"
//
// panel stores the pending channel as a config block doc and directs the user to the join-osn side modal
class OSNJoin extends Component {
	async componentDidMount() {
		const { buildCreateChannelOpts } = this.props;

		this.props.updateState(SCOPE, {
			loading: true,
		});

		// config block was passed in - load it
		const options = buildCreateChannelOpts();						// get all the input data together
		this.props.updateState(SCOPE, {
			channel_id: options ? options.channel_id : '',
		});

		clearTimeout(timer);
		timer = setTimeout(async () => {
			const my_block = StitchApi.buildGenesisBlockOSNadmin(options);
			const b_block = await this.createProto(my_block);
			let block_doc = null;

			if (b_block) {
				block_doc = await this.storeGenesisBlock(b_block, options.consenters, my_block);
			}

			this.props.updateState(SCOPE, {
				b_genesis_block: b_block,
				genesis_block_doc: block_doc,
				loading: false,
			});
		}, 1200);								// slow this down so the spinner doesn't flash
	}

	// main render
	render() {
		const {
			t: translate,
			channel_id,
			block_error,
		} = this.props;
		return (
			<div className="ibp-channel-osn-join">
				<p className="ibp-join-osn-section-title">
					{translate('osn_join_channel')}
				</p>
				<br />

				{block_error && (
					<div className="ibp-join-osn-error-wrap">
						<InlineNotification
							kind="error"
							title={translate('error')}
							subtitle={block_error}
							hideCloseButton={true}
						/>
					</div>
				)}

				{this.props.loading && <Loading withOverlay={false}
					className="ibp-wizard-loading"
				/>}

				{!block_error && this.props.loading && (
					<p><br /><br />{translate('osn-join-creating-block')}</p>
				)}

				{!block_error && !this.props.loading && (
					<div className='ibp-channel-section-genesis'>
						<left>
							<SVGs type={'partyPopper'}
								width="120px"
								height="120px"
							/>
						</left>
						<div className='ibp-channel-section-genesis-align'>
							<p className="ibp-join-osn-genesis ibp-channel-section-desc">
								{translate('osn-join-config-block', { channel: channel_id })}
							</p>

							<p className="ibp-join-osn-desc">
								{translate('osn-join-desc3')}
							</p>
						</div>
					</div>
				)}
			</div>
		);
	}

	// convert config block json to binary or show error
	async createProto(config_block) {
		const c_opts = {
			cfxl_host: this.props.configtxlator_url,
			data: config_block,
			message_type: 'Block'
		};
		try {
			return await StitchApi.jsonToPb(c_opts);
		} catch (e) {
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
			this.props.updateState(SCOPE, {
				block_error: 'Could not build genesis-block. Resolve error to continue: ' + details,
			});
			return null;
		}
	}

	// store the block in the console db or show error
	async storeGenesisBlock(bin_block, nodes_arr, json_block) {
		try {
			const channel_id = _.get(json_block, 'data.data[0].payload.header.channel_header.channel_id');
			const tx_id = _.get(json_block, 'data.data[0].payload.header.channel_header.tx_id');
			if (channel_id) {
				const apiResp = await ConfigBlockApi.store({
					channel_id: channel_id,
					b_block: bin_block,
					extra_consenter_data: nodes_arr,
					tx_id: tx_id,
				});

				// then reload them to force cache update
				await ConfigBlockApi.getAll({ cache: 'skip' });
				await ConfigBlockApi.getAll({ cache: 'skip', visibility: 'all' });		// do both types

				return apiResp;
			} else {
				return null;
			}
		} catch (e) {
			const code = (e && !isNaN(e.statusCode)) ? '(' + e.statusCode + ') ' : '';
			const details = (e && typeof e.msg === 'string') ? (code + e.msg) : '';

			this.props.updateState(SCOPE, {
				block_error: 'Could not store genesis-block. Resolve error to continue: ' + details,
			});
			return null;
		}
	}

	// convert config block binary to json or show error
	async parseProto(config_block) {
		const c_opts = {
			cfxl_host: this.props.configtxlator_url,
			data: config_block,
			message_type: 'Block'
		};
		try {
			return await StitchApi.pbToJson(c_opts);
		} catch (e) {
			const code = (e && !isNaN(e.status_code)) ? '(' + e.status_code + ') ' : '';
			const details = (e && typeof e.stitch_msg === 'string') ? (code + e.stitch_msg) : '';
			this.props.updateState(SCOPE, {
				block_error: 'Could not parse genesis-block. Resolve error to continue: ' + details,
			});
			return null;
		}
	}
}

const dataProps = {
	channel_id: PropTypes.string,
	loading: PropTypes.bool,
	configtxlator_url: PropTypes.string,
	block_error: PropTypes.string,
};

OSNJoin.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(OSNJoin));
