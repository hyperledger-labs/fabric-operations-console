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
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import TitleBar from '../TitleBar/TitleBar';
import { Button, Loading } from 'carbon-components-react';
import { updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import UserSettingsRestApi from '../../rest/UserSettingsRestApi';
import * as constants from '../../utils/constants';

const SCOPE = 'RequestAccess';

class RequestAccess extends Component {
	async componentDidMount() {
		this.props.updateState(SCOPE, {
			loading: false,
			pending: this.props.userInfo && this.props.userInfo.is_registered === true,
		});
	};

	// user has clicked button to register their username
	register_user = async () => {
		this.props.updateState(SCOPE, {
			loading: true,
		});

		try {
			await UserSettingsRestApi.registerSelf();
		} catch (e) {
			console.error('unable to register user', e);
		}
		setTimeout(() => {
			this.props.updateState(SCOPE, {
				loading: false,
				pending: true,
			});
		}, 500);
	}

	render() {
		const translate = this.props.t;
		const isIam = this.props.auth_scheme === constants.AUTH_IAM;
		return (
			<div>
				<Router>
					<TitleBar userInfo={this.props.userInfo}
						host_url={this.props.host_url}
						hideButtons
					/>
				</Router>
				<div className="ibp-request-access-container">
					<h3 className="ibp-request-access-label bx--type-gamma">{translate('request_access_header')}</h3>
					<p>{translate('request_access_details')}</p>
					<br />
					<br />
					{!isIam && this.props.userInfo && this.props.userInfo.loggedInAs && this.props.userInfo.loggedInAs.email &&
						<Button
							onClick={this.register_user}
							className="ibp-button ibm-label mig-button"
							disabled={this.props.loading || this.props.pending}
						>
							{translate('request_access_button')}&nbsp;&nbsp;
							{this.props.loading && <Loading withOverlay={false}
								small
								className="migration-progress-spinner"
							/>}
						</Button>
					}
					{!isIam && this.props.pending &&
						<p className="grey_txt">
							{translate('request_pending_txt')}
						</p>
					}
				</div>
			</div>
		);
	}
}

const dataProps = {
	loading: PropTypes.bool,
	pending: PropTypes.bool,
};

RequestAccess.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	userInfo: PropTypes.object,
	host_url: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
};

export default connect(state => {
	return Helper.mapStateToProps(state[SCOPE], dataProps);
}, {
	updateState,
})(withTranslation()(RequestAccess));
