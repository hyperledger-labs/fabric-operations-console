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
import { InlineNotification } from 'carbon-components-react';
import { withLocalize } from 'react-localize-redux';

const SidePanelWarning = props => {
	const translate = props.translate;
	return (
		<div className={(props.className ? props.className + ' ' : '') + 'ibp-side-panel-warning'}>
			<InlineNotification
				kind={props.kind ? props.kind : 'warning'}
				className={props.kind === 'warning' ? 'ibp-side-panel-warning-notification' : ''}
				title={translate(props.title)}
				subtitle={props.subtitle && typeof props.subtitle === 'string' ? translate(props.subtitle) : props.subtitle ? props.subtitle : null}
				hideCloseButton={true}
				caption=""
			/>
		</div>
	);
};

SidePanelWarning.defaultProps = {
	kind: 'warning',
};

SidePanelWarning.propTypes = {
	className: PropTypes.string,
	kind: PropTypes.string,
	title: PropTypes.string.isRequired,
	subtitle: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
	translate: PropTypes.func, // Provided by withLocalize
};

export default withLocalize(SidePanelWarning);
