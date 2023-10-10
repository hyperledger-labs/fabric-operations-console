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

const Import = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '32px'}
			height={height || '32px'}
			extendClass={extendClass}
			viewBox="0 0 32 32"
		>
			<title>{title}</title>
			<g>
				<path className="ibp-fill-color"
					d="M6 17l1.41 1.41L15 10.83V30h2V10.83l7.59 7.58L26 17 16 7 6 17z"
				/>
				<path className="ibp-fill-color"
					d="M6 8V4h20v4h2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4z"
				/>
			</g>
		</SvgContainer>
	);
};

Import.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Import;
