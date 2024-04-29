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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Helper from '../../../../utils/helper';
import { updateState } from '../../../../redux/commonActions';
import { withLocalize } from 'react-localize-redux';
import Form from '../../../Form/Form';
import _ from 'lodash';

const SCOPE = 'channelModal';

// This is step "ordering_service_organization"
//
// this panel allow selecting what org to use for the *orderer* signature
class OrdererSignature extends Component {
	render() {
		const { isOrdererSignatureNeeded, msps, selectedOrdererMsp, selectedOrderer, isCapabilityModified, translate } = this.props;
		const selected_orderer_msps = _.has(selectedOrderer, 'raft') ? selectedOrderer.raft.map(x => x.msp_id) : [selectedOrderer.msp_id];
		let orderer_msps = selectedOrderer && msps ? msps.filter(msp => selected_orderer_msps.includes(msp.msp_id)) : msps;
		return (
			<div className="ibp-orderer-signature">
				<p className="ibp-channel-section-title">{translate('ordering_service_organization')}</p>
				<p className="ibp-channel-section-desc">{translate('ordering_service_organization_desc')}</p>
				{msps && (
					<div className="ibp-orderer-msp-dropdown">
						<Form
							scope={SCOPE}
							id={SCOPE + '-signature'}
							fields={[
								{
									name: 'selectedOrdererMsp',
									type: 'dropdown',
									required: isOrdererSignatureNeeded,
									tooltip: isCapabilityModified ? 'capabilities_orderer_msp_tooltip' : 'orderer_msp_tooltip',
									options: orderer_msps,
									default: isOrdererSignatureNeeded && selectedOrdererMsp ? selectedOrdererMsp : 'selectedChannelCreator',
								},
							]}
						/>
					</div>
				)}
			</div>
		);
	}
}

const dataProps = {
	msps: PropTypes.array,
	selectedOrderer: PropTypes.any,
	selectedOrdererMsp: PropTypes.object,
};

OrdererSignature.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		updateState,
	}
)(withLocalize(OrdererSignature));
