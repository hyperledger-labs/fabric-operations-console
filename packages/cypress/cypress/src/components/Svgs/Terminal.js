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

const Terminal = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '24px'}
			height={height || '24px'}
			extendClass={extendClass}
			viewBox="0 0 24 24"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g id="terminal"
					fill="#fff"
					fillRule="nonzero"
				>
					<path
						d="M22,0 L2,0 C0.8954305,0 0,0.8954305 0,2 L0,22 C0,23.1045695
						0.8954305,24 2,24 L22,24 C23.1045695,24 24,23.1045695 24,22 L24,2 C24,0.8954305
						23.1045695,0 22,0 Z M22,2 L22,6 L2,6 L2,2 L22,2 Z M2,22 L2,8 L22,8 L22,22 L2,22 Z"
					/>
					<polygon points="5.586 12.414 8.172 15 5.586 17.586 7 19 11 15 7 11" />
				</g>
			</g>
		</SvgContainer>
	);
};

Terminal.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Terminal;
