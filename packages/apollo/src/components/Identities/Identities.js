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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import emptyImage from '../../assets/images/empty_identities.svg';
import { clearNotifications, showBreadcrumb, showError, updateState } from '../../redux/commonActions';
import { CertificateAuthorityRestApi } from '../../rest/CertificateAuthorityRestApi';
import IdentityApi from '../../rest/IdentityApi';
import StitchApi from '../../rest/StitchApi';
import Helper from '../../utils/helper';
import AddIdentityModal from '../AddIdentityModal/AddIdentityModal';
import IdentityModal from '../IdentityModal/IdentityModal';
import ItemContainer from '../ItemContainer/ItemContainer';
import Logger from '../Log/Logger';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import ActionsHelper from '../../utils/actionsHelper';
import { NodeRestApi } from '../../rest/NodeRestApi';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'identities';
const Log = new Logger(SCOPE);
const naturalSort = require('javascript-natural-sort');

// This is shown on the /wallet route!
class Identities extends Component {
	async componentDidMount() {
		this.identities = [];
		this.props.showBreadcrumb('wallet', {}, this.props.history.location.pathname, true);
		await this.getIdentities();
	}

	componentWillUnmount() {
		this.props.clearNotifications(SCOPE);
	}

	resolveConnectedNodes(identity, nodes) {
		const connected = [];
		nodes.forEach(node => {
			if (identity.peers && identity.peers.indexOf(node.id) !== -1) {
				connected.push(node.name);
			}
			if (identity.orderer && identity.orderer.indexOf(node.id) !== -1) {
				connected.push(node.name);
			}
			if (identity.cas && identity.cas.indexOf(node.id) !== -1) {
				connected.push(node.name);
			}
		});
		identity.connected = connected.join(', ');
	}

	async getCAsWithRootCerts(cas) {
		const list = [];
		let reqs = cas.map(async ca => {
			try {
				const rootCert = await CertificateAuthorityRestApi.getRootCertificate(ca);
				const tlsRootCert = await CertificateAuthorityRestApi.getRootCertificate(ca, true);
				const rootCerts = [rootCert, tlsRootCert];
				list.push({
					...ca,
					rootCerts,
				});
			} catch (e) {
				Log.error('unable to get root cert for ca', (ca ? ca.id : '?'), e);
			}
		});
		await Promise.all(reqs);		// dsh todo - limit number of requests at a time
		return list;
	}

	async getIdentities() {
		this.props.updateState(SCOPE, { loading: true });
		let ids = [];

		try {
			ids = await IdentityApi.getIdentities();
			const nodes = await NodeRestApi.getNodes();

			let cas = nodes.filter((x) => { return x && x.type === 'fabric-ca'; });
			const peers = nodes.filter((x) => { return x && x.type === 'fabric-peer'; });
			const orderers = nodes.filter((x) => { return x && x.type === 'fabric-orderer'; });
			cas = await this.getCAsWithRootCerts(cas);

			for (let i in ids) {
				const id = ids[i];
				for (let z in cas) {
					const ca = cas[z];
					const data = {
						certificate_b64pem: id.cert,
						root_certs_b64pems: ca.rootCerts,
					};
					let match = await StitchApi.isIdentityFromRootCert(data);
					if (match) {
						if (id.from_ca === undefined) {
							id.from_ca = [];
						}
						id.from_ca.push(ca.name);
					}
				}
				this.resolveConnectedNodes(id, [...peers, ...orderers, ...cas]);
			}
			this.identities = [...ids];
			this.props.updateState(SCOPE, { loading: false });
		} catch (error) {
			Log.error(error);

			// unable to show ca names
			this.identities = [...ids];
			this.props.updateState(SCOPE, { loading: false });
			this.props.showError('error_identities', {}, SCOPE);
		}
	}

	openAddIdentity = () => {
		this.props.updateState(SCOPE, { showAddIdentity: true });
	};

	closeAddIdenity = () => {
		this.props.updateState(SCOPE, { showAddIdentity: false });
	};

	removeIdentity(identity) {
		identity.loading = true;
		this.identities = [...this.identities];
		IdentityApi.removeIdentity(identity.name)
			.then(identities => {
				this.identities = identities;
			})
			.catch(error => {
				Log.error(error);
				this.props.showError('error_remove_identity', {}, SCOPE);
				identity.loading = false;
				this.identities = [...this.identities];
			});
	}

	showNewIdentities = newIdentities => {
		const identities = [];
		this.identities.forEach(id => {
			id.new = false;
			identities.push(id);
		});
		newIdentities.forEach(id => {
			id.new = true;
			identities.push(id);
		});
		identities.sort((a, b) => {
			return naturalSort(a.name, b.name);
		});
		this.identities = identities;
	};

	openIdentity = identity => {
		this.props.updateState(SCOPE, { selected: identity });
	};

	closeIdentity = () => {
		this.props.updateState(SCOPE, { selected: null });
	};

	buildCustomTile(identity) {
		const parsedCert = window.stitch.parseCertificate(identity.cert);
		const issuer = parsedCert.issuer;
		const translate = this.props.t;
		const from_ca = identity.from_ca ? identity.from_ca.join(',') : '';
		const label = _.endsWith(issuer, '-tlsca') ? 'from_tls_ca' : 'from_ca';
		return (
			<div className="ibp-identity-tile-stats">
				<div className="ibp-wallet-identity-expiration">
					<div>{parsedCert ? translate('expiration') + ': ' + Helper.fromNow(parsedCert.not_after_ts, translate) : ''}</div>
				</div>
				<div className="ibp-wallet-identity-from-ca">
					<div>{identity.from_ca ? translate(label) + ': ' + from_ca : ''}</div>
				</div>
			</div>
		);
	}

	render() {
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<PageHeader
							history={this.props.history}
							headerName="wallet"
							staticHeader
						/>
						{this.props.showAddIdentity && <AddIdentityModal onClose={this.closeAddIdenity}
							onComplete={this.showNewIdentities}
						/>}
						{this.props.selected && (
							<IdentityModal
								identity={this.props.selected}
								onClose={this.closeIdentity}
								onComplete={identities => {
									this.getIdentities();
								}}
							/>
						)}
						<div id="identities-container"
							className="ibp-identities-section"
						>
							<ItemContainer
								tooltipDirection="right"
								containerTitle="identities"
								containerTooltip="identities_heading_tooltip"
								emptyImage={emptyImage}
								emptyTitle="empty_identities_title"
								emptyMessage="empty_identities_text"
								id="test__identities--add--tile"
								itemId="identities"
								isLink
								loading={this.props.loading}
								items={this.identities}
								tileMapping={{
									title: 'name',
									custom: data => {
										return this.buildCustomTile(data);
									},
								}}
								listMapping={[
									{
										header: 'name',
										attr: 'name',
									},
									{
										header: 'connected_to',
										attr: 'connected',
									},
									{
										header: 'from_ca',
										attr: 'from_ca',
									},
								]}
								addItems={[
									{
										text: 'add_identity',
										fn: this.openAddIdentity,
										disabled: ActionsHelper.inReadOnly(this.props.feature_flags),
									},
								]}
								select={this.openIdentity}
							/>
						</div>
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	showAddIdentity: PropTypes.bool,
	selected: PropTypes.object,
};

Identities.propTypes = {
	...dataProps,
	clearNotifications: PropTypes.func,
	showBreadcrumb: PropTypes.func,
	showError: PropTypes.func,
	updateState: PropTypes.func,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		return newProps;
	},
	{
		clearNotifications,
		showBreadcrumb,
		showError,
		updateState,
	}
)(withTranslation()(withRouter(Identities)));
