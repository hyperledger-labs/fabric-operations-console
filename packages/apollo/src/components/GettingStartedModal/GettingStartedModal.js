/*
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
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { showError, showInfo, showSuccess, updateState } from '../../redux/commonActions';
import FocusComponent from '../FocusComponent/FocusComponent';
import Helper from '../../utils/helper';
import { setInStorage } from '../../utils/localStorage';
//import Logger from '../Log/Logger';
import SidePanel from '../SidePanel/SidePanel';
import EcosystemDiagram from './EcosystemDiagram';

const SCOPE = 'gettingStartedModal';
//const Log = new Logger(SCOPE);

class GettingStartedModal extends Component {
	duplicateObject = src => {
		return _.cloneDeep(src);
	};
	componentDidMount() {
		// make copies of developer and starter json files.
		this.handleStatusTimeout = 0;
		const body = document.querySelector('body');
		body.style.overflow = 'hidden';
		this.props.updateState(SCOPE, {
			viewingDiagram: true,
			viewingGetStartedOptions: false,
			topic: 'cas',
			selectedGettingStartedOption: 'standard',
			receivedPeerDetails: false,
			prefixHasBeenAdded: false,
			removingIdentities: false,
			cleaningUpIdentities: false,
		});
	}

	componentWillUnmount() {
		const body = document.querySelector('body');
		body.style.overflow = 'auto';
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: false,
		});
		if (this.handleStatusTimeout) {
			clearTimeout(this.handleStatusTimeout);
			this.handleStatusTimeout = 0;
		}
	}

	onSubmit = () => {
		return new Promise(resolve => {
			setInStorage('showDiagram', false);
			resolve(this.props.onComplete());
		});
	};

	renderDiagram(translate) {
		const { viewingDiagram, viewingGetStartedOptions } = this.props;
		if (viewingGetStartedOptions) {
			return;
		}
		if (viewingDiagram) {
			return (
				<>
					<div className="ibp-template-header-container">
						<h1 className="ibp-template-header ibp--template-full-page-header">{translate('welcome_to_ibp')}</h1>
						<p className="ibp-modal-desc ibp-welcome-desc">{translate('welcome_desc_1')}</p>
					</div>
					<EcosystemDiagram />
				</>
			);
		}
	}

	setFocus = () => {
		// set focus to first item on step
		this.props.updateState(SCOPE, { setFocus: false });
		window.setTimeout(() => {
			this.props.updateState(SCOPE, { setFocus: true });
		}, 100);
	};

	showDiagram = () => {
		this.props.updateState(SCOPE, {
			viewingDiagram: true,
			viewingGetStartedOptions: false,
		});
		this.setFocus();
	};

	showGettingStartedChoices = () => {
		this.props.updateState(SCOPE, {
			viewingDiagram: false,
			viewingGetStartedOptions: true,
		});
		this.setFocus();
	};

	setSelectedGettingStartedOption = option => {
		if (option === 'standard') {
			this.props.updateState(SCOPE, {
				selectedGettingStartedOption: 'standard',
			});
		}
	};

	getButtons(translate) {
		const {
			viewingDiagram,
			viewingGetStartedOptions,
		} = this.props;
		let buttons = [];
		if (viewingDiagram) {
			buttons.push({
				id: 'lets_get_started',
				text: translate('lets_get_started'),
				onClick: this.onSubmit,
			});
		}

		if (viewingGetStartedOptions) {
			buttons.push(
				{
					id: 'back',
					text: translate('back'),
					onClick: this.showDiagram,
				},
				{
					id: 'next',
					text: translate('next'),
					onClick: this.props.onClose,
				}
			);
		}
		return buttons;
	}

	render() {
		const translate = this.props.translate;
		return (
			<SidePanel
				id='ibp--template-side-panel-container'
				closed={this.props.onClose}
				onSubmit={this.onSubmit}
				ref={sidePanel => (this.sidePanel = sidePanel)}
				submitButtonLabel={translate('lets_get_started')}
				buttons={this.getButtons(translate)}
				diagramWizard
				error={this.props.error}
				verticalPanel
			>
				<FocusComponent setFocus={this.props.setFocus}>
					{this.renderDiagram(translate)}
				</FocusComponent>
			</SidePanel>
		);
	}
}

const dataProps = {
	activeItem: PropTypes.string,
	activeTextItem: PropTypes.string,
	error: PropTypes.string,
	viewingDiagram: PropTypes.bool,
	viewingGetStartedOptions: PropTypes.bool,
	messages: PropTypes.array,
	selectedGettingStartedOption: PropTypes.string,
	topic: PropTypes.string,
	selectedTimelineStep: PropTypes.object,
	ordererNotAvailable: PropTypes.bool,
	deployingChannelError: PropTypes.bool,
	receivedPeerDetails: PropTypes.bool,
	prefixHasBeenAdded: PropTypes.bool,
	removingIdentities: PropTypes.bool,
	cleaningUpIdentities: PropTypes.bool,
	getOrderingService: PropTypes.func,
	setFocus: PropTypes.bool,
};

GettingStartedModal.propTypes = {
	...dataProps,
	onComplete: PropTypes.func,
	onClose: PropTypes.func,
	updateState: PropTypes.func,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(
	state => {
		let newProps = Helper.mapStateToProps(state[SCOPE], dataProps);
		newProps['feature_flags'] = state['settings'] ? state['settings']['feature_flags'] : null;
		newProps['configtxlator_url'] = state['settings']['configtxlator_url'];
		newProps['userInfo'] = state['userInfo'] ? state['userInfo'] : null;
		return newProps;
	},
	dispatch => {
		return {
			dispatch,
			...bindActionCreators(
				{
					showError,
					showInfo,
					showSuccess,
					updateState,
				},
				dispatch
			),
		};
	}
)(withLocalize(GettingStartedModal));
