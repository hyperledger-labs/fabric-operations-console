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
import React from 'react';
import SvgContainer from './SvgContainer';

const VisibilityOn = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '16px'}
			viewBox="0 0 16 16"
			width={width || '16px'}
		>
			<title>{title}</title>
			<g fill="#fff"
				transform="translate(0 3)"
			>
				<path d="M8 7.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 1c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
				<path d="M8 10c2.8 0 5.1-1.5 6.9-4.6C13.1 2.5 10.8 1 8 1 5.2 1 3 2.4 1.2 5.4 2.9 8.6 5.2 10 8 10zM8 0c3.3 0 6 1.8 8.1 5.4C14 9.2 11.3 11 8 11S2 9.2 0 5.5C2 1.9 4.6 0 8 0z" />
			</g>
		</SvgContainer>
	);
};
VisibilityOn.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default VisibilityOn;
