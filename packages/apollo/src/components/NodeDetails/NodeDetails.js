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
import { withLocalize } from 'react-localize-redux';

class NodeDetails extends Component {
	getTitle() {
		switch (this.props.node.type) {
			case 'fabric-peer':
			case 'peer':
				return 'peer_information';
			case 'fabric-orderer':
			case 'orderer':
				return 'orderer_node_information';
			default:
				return 'info';
		}
	}

	renderField(translate, field) {
		if (!_.get(this.props.node, field)) {
			return;
		}
		return [
			<div className="node-details-field-name"
				key={field + '-name'}
			>
				{translate(field)}
			</div>,
			<div className="node-details-field-value"
				key={field + '-value'}
			>
				{_.get(this.props.node, field)}
			</div>,
		];
	}

	render() {
		const translate = this.props.translate;
		return (
			<div className="node-details-panel">
				<div className="node-details-title>">{translate(this.getTitle())}</div>
				<div className="node-details-data">
					<div className="node-details-column">
						{this.renderField(translate, 'grpcwp_url')}
						{this.renderField(translate, 'msp_id')}
						{this.renderField(translate, 'msp.ca.name')}
						{this.renderField(translate, 'msp.tlsca.name')}
					</div>
					<div className="node-details-column">
						{this.renderField(translate, 'api_url')}
						{this.renderField(translate, 'operations_url')}
						{this.renderField(translate, 'hsm.pkcs11endpoint')}
					</div>
				</div>
			</div>
		);
	}
}

NodeDetails.propTypes = {
	node: PropTypes.object,
	translate: PropTypes.func,
};

export default withLocalize(NodeDetails);
