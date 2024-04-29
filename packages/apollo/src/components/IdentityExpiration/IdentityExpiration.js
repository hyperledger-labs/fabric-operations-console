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
import { WarningFilled16 } from '@carbon/icons-react/es';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { updateState } from '../../redux/commonActions';
import IdentityApi from '../../rest/IdentityApi';
import { MspRestApi } from '../../rest/MspRestApi';
import StitchApi from '../../rest/StitchApi';
import * as constants from '../../utils/constants';
import Helper from '../../utils/helper';

const SCOPE = 'identityExpiration';

class IdentityExpiration extends Component {
	componentDidMount() {
		const scope = SCOPE + '_' + this.props.identity;
		this.props.updateState(scope, {
			expiration: null,
			admin: true,
		});
		if (this.props.identity) {
			this.getExpiration();
			this.checkAdmin();
		}
	}

	async getExpiration() {
		const id = await IdentityApi.getIdentity(this.props.identity);
		const timeNow = new Date().getTime();
		const parsedCert = StitchApi.parseCertificate(id.cert);
		const diff = parsedCert.not_after_ts - timeNow;
		const days = diff / (1000 * 3600 * 24);
		if (days < constants.CERTIFICATE_WARNING_DAYS) {
			const scope = SCOPE + '_' + this.props.identity;
			const expiration = new Date(parsedCert.not_after_ts).toLocaleString();
			this.props.updateState(scope, { expiration });
		}
	}

	async getMsp() {
		let msp = null;
		if (this.props.details && this.props.details.msp_id) {
			const msps = await MspRestApi.getAllMsps();
			msps.forEach(test => {
				if (test && test.msp_id === this.props.details.msp_id) {
					const ca_root_certs = _.get(this.props.details, 'msp.ca.root_certs') || [];
					const msp_root_certs = test.root_certs || [];
					if (_.intersection(ca_root_certs, msp_root_certs).length >= 1) {
						msp = test;
					}
				}
			});
		}
		return msp;
	}

	async checkAdmin() {
		const msp = await this.getMsp();
		const scope = SCOPE + '_' + this.props.identity;
		let admin = false;
		let node_ou = _.get(msp, 'fabric_node_ous.enable', false);
		const id = await IdentityApi.getIdentity(this.props.identity);
		if (node_ou) {
			const parsed = id.cert ? window.stitch.parseCertificate(id.cert) : null;
			if (parsed && parsed.subject.indexOf('/OU=admin/') !== -1) {
				admin = true;
			}
		}
		if (!admin && msp && msp.admins) {
			msp.admins.forEach(test => {
				if (test === id.cert) {
					admin = true;
				}
			});
		}
		// If component is a ca, set admin to true so non-admin message doesn't appear
		if (this.props.details && this.props.details.node_type === 'fabric-ca') {
			admin = true;
		}
		this.props.updateState(scope, { admin });
	}

	render() {
		const translate = this.props.t;
		return (
			<div>
				{!this.props.admin && <div className="ibp-identity-admin">{translate('non_admin_identity')}</div>}
				{this.props.expiration && (
					<div className="ibp-identity-expiration">
						<WarningFilled16 />
						{translate('expiration')}: {this.props.expiration}
					</div>
				)}
			</div>
		);
	}
}

const dataProps = {
	expiration: PropTypes.string,
	admin: PropTypes.bool,
};

IdentityExpiration.propTypes = {
	...dataProps,
	identity: PropTypes.string,
	details: PropTypes.object,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	(state, props) => {
		const scope = SCOPE + '_' + props.identity;
		return Helper.mapStateToProps(state[scope], dataProps);
	},
	{
		updateState,
	}
)(withTranslation()(IdentityExpiration));
