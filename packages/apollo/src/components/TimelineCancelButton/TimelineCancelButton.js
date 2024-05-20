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
import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

const TimelineCancelButton = ({ onClose, closeMessage, t: translate }) => {
	return (
		<button className="ibp-timeline-cancel-button"
			onClick={() => onClose()}
		>
			<p className="ibp-timeline-cancel-button-label">{translate('cancel')}</p>
			<p className="ibp-timeline-cancel-button-label-subtext">{!closeMessage ? translate('progress_will_not_save') : translate(closeMessage)}</p>
		</button>
	);
};

TimelineCancelButton.propTypes = {
	onClose: PropTypes.func,
	closeMessage: PropTypes.string,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withTranslation()(TimelineCancelButton);
