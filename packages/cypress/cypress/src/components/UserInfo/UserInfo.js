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
import { updateState } from '../../redux/commonActions';
import ConfigureAuthApi from '../../rest/ConfigureAuthApi';
import ActionsHelper from '../../utils/actionsHelper';
import Helper from '../../utils/helper';
import UserAvatar20 from '@carbon/icons-react/lib/user--avatar/20';

const SCOPE = 'userInfo';

export class UserInfo extends Component {
	componentDidMount() {
		this.props.updateState(SCOPE, {
			showUserInfo: false,
		});
		this.getUserRole();
	}

	getUserRole = () => {
		ConfigureAuthApi.listUsers().then(resp => {
			this.props.updateState(SCOPE, {
				role: this.props.userInfo
					? ActionsHelper.canRestartOpTools(this.props.userInfo)
						? 'manager'
						: ActionsHelper.canImportComponent(this.props.userInfo, this.props.feature_flags)
							? 'writer'
							: 'reader'
					: null,
			});
		});
	};

	render() {
		const showInfo = this.props.authScheme === 'couchdb' ? (this.props.userInfo ? this.props.userInfo.password_type !== 'default' : false) : true;
		if (this.props && this.props.userInfo && this.props.userInfo.logged && showInfo) {
			return (
				<div className="ibp-title-bar-login"
					id="user-profile-container"
				>
					<UserAvatar20 className="ibp-user-info-header-icon" />
				</div>
			);
		} else {
			return null;
		}
	}
}

const dataProps = {
	host_url: PropTypes.string,
	role: PropTypes.string,
	canLogout: PropTypes.bool,
	userInfo: PropTypes.object,
	onWelcomeClose: PropTypes.func,
	showUserInfo: PropTypes.bool,
};

UserInfo.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
};

UserInfo.defaultProps = {
	showUserInfo: false,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		newProps['authScheme'] = state['settings'] ? state['settings']['authScheme'] : null;
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		return newProps;
	},
	{
		updateState,
	}
)(UserInfo);
