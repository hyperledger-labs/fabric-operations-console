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
import { connect } from 'react-redux';
import { showBreadcrumb, showSuccess, showError, updateState } from '../../redux/commonActions';
import CertificateAuthority from '../CertificateAuthority/CertificateAuthority';
import Helper from '../../utils/helper';
import OrderersComponent from '../Orderers/Orderers';
import PageContainer from '../PageContainer/PageContainer';
import PageHeader from '../PageHeader/PageHeader';
import PeersComponent from '../Peers/Peers';
import WelcomeMessage from '../WelcomeMessage/WelcomeMessage';
import ServiceInstanceRestApi from '../../rest/ServiceInstanceApi';
import Logger from '../Log/Logger';
import withRouter from '../../hoc/withRouter';

const SCOPE = 'main';
const Log = new Logger(SCOPE);

class Nodes extends Component {
	componentDidMount() {
		this.props.showBreadcrumb('nodes', {}, this.props.location.pathname, true);
		ServiceInstanceRestApi.getClusterStatus()
			.then(resp => {
				if (resp.info.state !== 'normal') {
					this.props.showError('cluster_failure_message', { name: resp.clusterName }, SCOPE);
				}
			})
			.catch(error => {
				Log.error(error);
			});

		this.props.updateState(SCOPE, {
			showCertNotice: false,
			createdArr: null,
		});
	}

	triggerCertNotice = (createdArr) => {
		console.log('createdArr', createdArr);
		this.props.updateState(SCOPE, {
			showCertNotice: true,
			createdArr: createdArr
		});
	}

	redirect = () => {
		window.open('https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform');
	};

	render() {
		return (
			<PageContainer>
				<div className="bx--row">
					<div className="bx--col-lg-13">
						<WelcomeMessage />
						<PageHeader
							history={this.props.history}
							headerName="nodes"
							showCertNotice={this.props.showCertNotice}
							createdArr={this.props.createdArr}
							staticHeader
						/>
						<div className="ibp-nodes-section">
							<PeersComponent history={this.props.history} />
						</div>
						<div className="ibp-nodes-section">
							<CertificateAuthority
								history={this.props.history}
								onCreate={this.triggerCertNotice}
							/>
						</div>
						<div className="ibp-nodes-section">
							<OrderersComponent history={this.props.history} />
						</div>
					</div>
				</div>
			</PageContainer>
		);
	}
}

const dataProps = {
	showCertNotice: PropTypes.bool,
	createdArr: PropTypes.object,
};

Nodes.propTypes = {
	...dataProps,
	history: PropTypes.object,
	showBreadcrumb: PropTypes.func,
};

export default connect(
	state => {
		return Helper.mapStateToProps(state[SCOPE], dataProps);
	},
	{
		showBreadcrumb,
		showSuccess,
		showError,
		updateState,
	}
)(withRouter(Nodes));
