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
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Api from './Api';
import AppConsole from './AppConsole';
import ArrowLeft from './ArrowLeft';
import ArrowRight from './ArrowRight';
import ArrowUp from './ArrowUp';
import Bell from './Bell';
import Catalog from './Catalog';
import ChevronDown from './ChevronDown';
import CircleFilled from './CircleFilled';
import Clock from './Clock';
import Close from './Close';
import Cloud from './Cloud';
import Copy from './Copy';
import Dataset from './Dataset';
import Download from './Download';
import Error from './Error';
import Expand from './Expand';
import FabricNodes from './FabricNodes';
import Fingerprint from './Fingerprint';
import Grid from './Grid';
import Help from './Help';
import IbmCloud from './IbmCloud';
import IndividualNode from './IndividualNode';
import Infrastructure from './Infrastructure';
import Import from './Import';
import Launch from './Launch';
import List from './List';
import Member from './Member';
import Msp from './Msp';
import Next from './Next';
import Notification from './Notification';
import NewNotification from './NewNotification';
import Partnership from './Partnership';
import PartyPopper from './PartyPopper';
import Plus from './Plus';
import Previous from './Previous';
import Restart from './Restart';
import Settings from './Settings';
import StepperCheck from './StepperCheck';
import StepperCircleFill from './StepperCircleFill';
import StepperCircleOutline from './StepperCircleOutline';
import Success from './Success';
import Terminal from './Terminal';
import Trash from './Trash';
import Upload from './Upload';
import UserAvatar from './UserAvatar';
import VariableGrid from './VariableGrid';
import VisibilityOn from './VisibilityOn';
import VisibilityOff from './VisibilityOff';
import Wallet from './Wallet';
import Warning from './Warning';
import { withLocalize } from 'react-localize-redux';

class SVGs extends Component {
	setDimensions(component, translate) {
		const { width, height, type, extendClass, title } = this.props;
		let svgTitle = title ? title : translate(type);
		return React.cloneElement(component, { title: svgTitle, width, height, extendClass: cx({ [type + 'Icon']: true, ...extendClass }) });
	}

	selectSVG(type, translate) {
		switch (type) {
			case 'arrowLeft':
				return this.setDimensions(<ArrowLeft />, translate);
			case 'arrowRight':
				return this.setDimensions(<ArrowRight />, translate);
			case 'arrowUp':
				return this.setDimensions(<ArrowUp />, translate);
			case 'api':
				return this.setDimensions(<Api />, translate);
			case 'appConsole':
				return this.setDimensions(<AppConsole />, translate);
			case 'bell':
				return this.setDimensions(<Bell />, translate);
			case 'catalog':
				return this.setDimensions(<Catalog />, translate);
			case 'chevronDown':
				return this.setDimensions(<ChevronDown />, translate);
			case 'circleFilled':
				return this.setDimensions(<CircleFilled />, translate);
			case 'clock':
				return this.setDimensions(<Clock />, translate);
			case 'close':
				return this.setDimensions(<Close />, translate);
			case 'cloud':
				return this.setDimensions(<Cloud />, translate);
			case 'copy':
				return this.setDimensions(<Copy />, translate);
			case 'dataset':
				return this.setDimensions(<Dataset />, translate);
			case 'error':
				return this.setDimensions(<Error />, translate);
			case 'expand':
				return this.setDimensions(<Expand />, translate);
			case 'fabricNodes':
				return this.setDimensions(<FabricNodes />, translate);
			case 'download':
				return this.setDimensions(<Download />, translate);
			case 'fingerprint':
				return this.setDimensions(<Fingerprint />, translate);
			case 'grid':
				return this.setDimensions(<Grid />, translate);
			case 'help':
				return this.setDimensions(<Help />, translate);
			case 'ibmCloud':
				return this.setDimensions(<IbmCloud />, translate);
			case 'import':
				return this.setDimensions(<Import />, translate);
			case 'individualNode':
				return this.setDimensions(<IndividualNode />, translate);
			case 'infrastructure':
				return this.setDimensions(<Infrastructure />, translate);
			case 'launch':
				return this.setDimensions(<Launch />, translate);
			case 'list':
				return this.setDimensions(<List />, translate);
			case 'member':
				return this.setDimensions(<Member />, translate);
			case 'msp':
				return this.setDimensions(<Msp />, translate);
			case 'next':
				return this.setDimensions(<Next />, translate);
			case 'notification':
				return this.setDimensions(<Notification />, translate);
			case 'newNotification':
				return this.setDimensions(<NewNotification />, translate);
			case 'partnership':
				return this.setDimensions(<Partnership />, translate);
			case 'partyPopper':
				return this.setDimensions(<PartyPopper />, translate);
			case 'previous':
				return this.setDimensions(<Previous />, translate);
			case 'plus':
				return this.setDimensions(<Plus />, translate);
			case 'restart':
				return this.setDimensions(<Restart />, translate);
			case 'settings':
				return this.setDimensions(<Settings />, translate);
			case 'stepperComplete':
				return this.setDimensions(<StepperCheck />, translate);
			case 'stepperCurrent':
				return this.setDimensions(<StepperCircleFill />, translate);
			case 'stepperIncomplete':
				return this.setDimensions(<StepperCircleOutline />, translate);
			case 'success':
				return this.setDimensions(<Success />, translate);
			case 'terminal':
				return this.setDimensions(<Terminal />, translate);
			case 'trash':
				return this.setDimensions(<Trash />, translate);
			case 'upload':
				return this.setDimensions(<Upload />, translate);
			case 'userAvatar':
				return this.setDimensions(<UserAvatar />, translate);
			case 'variableGrid':
				return this.setDimensions(<VariableGrid />, translate);
			case 'visibilityOn':
				return this.setDimensions(<VisibilityOn />, translate);
			case 'visibilityOff':
				return this.setDimensions(<VisibilityOff />, translate);
			case 'wallet':
				return this.setDimensions(<Wallet />, translate);
			case 'warning':
				return this.setDimensions(<Warning />, translate);

			default:
				return false;
		}
	}

	render() {
		const { type, translate } = this.props;
		return this.selectSVG(type, translate);
	}
}

SVGs.propTypes = {
	width: PropTypes.string,
	height: PropTypes.string,
	type: PropTypes.string,
	extendClass: PropTypes.object,
	title: PropTypes.string,
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(SVGs);
