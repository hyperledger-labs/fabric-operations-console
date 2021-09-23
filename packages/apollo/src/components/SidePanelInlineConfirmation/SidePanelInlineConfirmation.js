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
import React from 'react';
import PropTypes from 'prop-types';
import Close from '@carbon/icons-react/lib/close/20';

const SidePanelInlineConfirmation = props => {
	return (
		<div className={`ibp-side-panel-inline-confirmation-container ${props.opening}`}>
			<h4 className="ibp-side-panel-inline-confirmation-title">{props.title}</h4>
			<p className="ibp-side-panel-inline-confirmation-subtitle">{props.subtitle}</p>
			<Close aria-label="Close"
				className="ibp-side-panel-inline-close-icon"
				onClick={props.clearNotification}
			/>
		</div>
	);
};

SidePanelInlineConfirmation.propTypes = {
	title: PropTypes.string,
	subtitle: PropTypes.string,
	clearNotification: PropTypes.func,
	opening: PropTypes.string,
};

export default SidePanelInlineConfirmation;
