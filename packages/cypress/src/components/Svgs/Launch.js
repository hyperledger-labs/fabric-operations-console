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

const Launch = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '32px'}
			viewBox="0 0 16 16"
			width={width || '32px'}
		>
			<title>{title}</title>
			<g className="ibp-fill-color">
				<path d="M14.3 1h-3.8V0H16v5.5h-1V1.7L9.7 7 9 6.3 14.3 1z" />
				<path d="M14.3 1h-3.8V0H16v5.5h-1V1.7L9.7 7 9 6.3 14.3 1z" />
				<path d="M13 9h1v6c0 .6-.4 1-1 1H1c-.6 0-1-.4-1-1V3c0-.6.4-1 1-1h7v1H1v12h12V9z" />
			</g>
		</SvgContainer>
	);
};

Launch.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Launch;
