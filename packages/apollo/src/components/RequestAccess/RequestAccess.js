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
import { BrowserRouter as Router } from 'react-router-dom';
import TitleBar from '../TitleBar/TitleBar';

class RequestAccess extends Component {
	render() {
		const translate = this.props.translate;
		return (
			<div>
				<Router>
					<TitleBar userInfo={this.props.userInfo}
						host_url={this.props.host_url}
						hideButtons
					/>
				</Router>
				<div className="ibp-request-access-container">
					<div className="ibp-not-authorized-label bx--type-beta">{translate('not_authorized')}</div>
					<div className="ibp-request-access-label bx--type-gamma">{translate('request_access')}</div>
					<div className="bx--type-zeta">{translate('request_access_details', { admin: this.props.adminContact })}</div>
				</div>
			</div>
		);
	}
}

RequestAccess.propTypes = {
	adminContact: PropTypes.array,
	userInfo: PropTypes.object,
	host_url: PropTypes.string,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(RequestAccess);
