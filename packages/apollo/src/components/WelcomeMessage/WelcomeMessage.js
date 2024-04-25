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
import { showBreadcrumb, updateState } from '../../redux/commonActions';
import Helper from '../../utils/helper';
import Svgs from '../Svgs/Svgs';

const SCOPE = 'welcome';

class WelcomeMessage extends Component {
	componentDidMount() {
		if (!localStorage.getItem('hideWelcome') || localStorage.getItem('hideWelcome') === 'false') {
			this.props.updateState(SCOPE, {
				showWelcomeNotification: true,
			});
			localStorage.setItem('hideWelcome', false);
		} else {
			this.props.updateState(SCOPE, {
				showWelcomeNotification: false,
			});
			localStorage.setItem('hideWelcome', true);
		}
	}

	openLearnMore = translate => {
		window.open(translate('_GABLOG'));
	};

	render() {
		const translate = this.props.translate;
		return (
			<>
				{this.props.opToolsVersion === 'v1.0' ? (
					<div className="ibp-nodes-welcome">
						<div>
							<div className="ibp-nodes-welcome-main">
								<div>
									<div className="ibp-nodes-welcome-header-container">
										<h2 className="ibp-nodes-welcome-head">{translate('ibp_ga_header_message')}</h2>
									</div>
									<p className="ibp-nodes-welcome-desc">{translate('ibp_ga_description')}</p>
									<p className="ibp-nodes-welcome-desc">
										<span className="ibp-ga-welcome-desc">{translate('ibp_beta_close_date_desc')}</span>
										<span className="ibp-beta-close-date">{translate('ibp_beta_close_date')}</span>
									</p>
								</div>
								<Svgs type="partyPopper"
									extendClass={{ partyPopper: true }}
								/>
							</div>
							<div className="ibp-nodes-welcome-bar">
								<button
									id="start-bar"
									className={'ibp-nodes-welcome-start-btn ' + (this.props.showStart ? 'active' : '')}
									onClick={() => this.openLearnMore(translate)}
								>
									<p className="ibp-nodes-welcome-start-text">{translate('learn_more_about_ga')}</p>
									<div className="ibp-nodes-welcome-start-expand">
										<Svgs extendClass={{ launch: true }}
											type="launch"
										/>
									</div>
								</button>
							</div>
						</div>
					</div>
				) : null}
			</>
		);
	}
}

const dataProps = {
	showWelcomeNotification: PropTypes.bool,
	showStart: PropTypes.bool,
	showBuild: PropTypes.bool,
	showJoin: PropTypes.bool,
	showDeploy: PropTypes.bool,
	buildSteps: PropTypes.number,
	joinSteps: PropTypes.number,
	deploySteps: PropTypes.number,
	buildPrefix: PropTypes.string,
	joinPrefix: PropTypes.string,
	deployPrefix: PropTypes.string,
	startCollapsing: PropTypes.bool,
	buildCollapsing: PropTypes.bool,
	joinCollapsing: PropTypes.bool,
	deployCollapsing: PropTypes.bool,
};

WelcomeMessage.propTypes = {
	...dataProps,
	updateState: PropTypes.func,
	clicked: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

WelcomeMessage.defaultProps = {
	showWelcomeNotification: true,
	showStart: false,
	showBuild: false,
	showJoin: false,
	showDeploy: false,
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['opToolsVersion'] = state['settings'] ? state['settings']['version'] : null;
		return newProps;
	},
	{
		showBreadcrumb,
		updateState,
	}
)(withLocalize(WelcomeMessage));
