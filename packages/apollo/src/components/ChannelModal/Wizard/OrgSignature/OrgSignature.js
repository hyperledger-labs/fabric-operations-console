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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { updateState } from '../../../../redux/commonActions';
import IdentityApi from '../../../../rest/IdentityApi';
import Helper from '../../../../utils/helper';
import Form from '../../../Form/Form';
import ImportantBox from '../../../ImportantBox/ImportantBox';
import _ from 'lodash';

const SCOPE = 'channelModal';

// This is step "organization_creating_channel"
//
// this panel allow selecting what org to use for the *channel* signature
class OrgSignature extends Component {
	componentDidMount() {
		let mspIdentities = [];
		this.props.updateState(SCOPE, {
			mspIdentities,
		});
		this.getIdentities(this.props.selectedChannelCreator);
	}

	async getIdentities(msp) {
		let mspIdentities = [];
		if (msp && msp.msp_id) {
			mspIdentities = await IdentityApi.getIdentitiesForMsp(msp);
		}
		this.props.updateState(SCOPE, {
			mspIdentities,
		});
	}

	render() {
		const { msps, orgs, mspIdentities, selectedChannelCreator, selectedIdentity, isChannelUpdate, translate } = this.props;
		const fields = [
			{
				name: 'selectedChannelCreator',
				label: isChannelUpdate ? 'channel_updater_msp' : 'channel_creator_msp',
				required: true,
				type: 'dropdown',
				tooltip: isChannelUpdate ? 'channel_updater_msp_tooltip' : 'channel_creator_msp_tooltip',
				options: msps && msps.length > 0 ? msps.filter(x => orgs.find(y => y.msp === x.msp_id && _.intersection(x.root_certs, y.root_certs).length >= 1)) : [],
				default: selectedChannelCreator ? selectedChannelCreator : 'selectedChannelCreator',
				loading: this.props.editLoading,
			},
			{
				name: 'selectedIdentity',
				type: 'dropdown',
				required: true,
				options: mspIdentities,
				default: selectedIdentity ? selectedIdentity : 'select_identity',
				loading: this.props.editLoading,
			},
		];
		return (
			<div className="ibp-org-signature">
				<p className="ibp-channel-section-title">{isChannelUpdate ? translate('organization_updating_channel') : translate('organization_creating_channel')}</p>
				<p className="ibp-channel-section-desc">{isChannelUpdate ? translate('channel_updater_msp_desc') : translate('channel_creator_msp_desc')}</p>
				<div className="ibp-channel-organization-impbox">
					<ImportantBox text="create_channel_signing_org_message"
						kind="informational"
					/>
				</div>
				<div className="ibp-channel-creator">
					<div className="ibp-split-details">
						{msps && (
							<div className="ibp-channel-name">
								<Form
									scope={SCOPE}
									id={SCOPE + '-signature'}
									fields={fields}
									onChange={data => {
										if (data.selectedChannelCreator) {
											this.getIdentities(data.selectedChannelCreator);
										}
									}}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}
}

const dataProps = {
	msps: PropTypes.array,
	orgs: PropTypes.array,
	identities: PropTypes.array,
	selectedChannelCreator: PropTypes.any,
	selectedIdentity: PropTypes.object,
	isChannelUpdate: PropTypes.bool,
	mspIdentities: PropTypes.array,
};

OrgSignature.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
	editLoading: PropTypes.bool,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(OrgSignature));
