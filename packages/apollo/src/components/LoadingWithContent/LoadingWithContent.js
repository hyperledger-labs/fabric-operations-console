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

import { Loading } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';

/**
 * @param {object} props Properties of the component.
 * @param {boolean} [props.active] Set to false to turn off the loading spinner.
 * @param {boolean} [props.withOverlay] Set to false to display the loader inline.
 * @param {boolean} [props.small] Set to true to shrink the loading spinner.
 * @param {string} [props.description] Controls the hover text for the loading spinner.
 * @param {('vertical'|'horizontal')} [props.direction] Controls the flex direction for the loading content.  Defaults to vertical.
 * @param {array} [props.children] Put your JSX to render below or next to the loading spinner here.
 * @return {Object} A Loading component with the provided content.
 * @constructor
 */
export default function LoadingWithContent({
	active = true,
	children,
	description = 'Active loading indicator',
	direction = 'vertical',
	small = false,
	withOverlay = true,
}) {
	// Flex displays in the horizontal direction by default
	let dirClass = '';
	if (direction === 'vertical') dirClass = 'flex-d-column';

	return (
		<div className={`ibp-loading-with-content ${withOverlay ? 'bx--loading-overlay' : ''} ${dirClass}`}>
			{active && <Loading small={small}
				withOverlay={false}
				description={description}
			/>}
			<div>{children}</div>
		</div>
	);
}

LoadingWithContent.propTypes = {
	active: PropTypes.bool,
	children: PropTypes.object,
	description: PropTypes.string,
	direction: PropTypes.string,
	small: PropTypes.bool,
	withOverlay: PropTypes.bool,
};
