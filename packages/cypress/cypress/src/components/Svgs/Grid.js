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

const Grid = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '24px'}
			height={height || '24px'}
			extendClass={extendClass}
			viewBox="0 0 24 24"
			role="img"
		>
			<title>{title}</title>
			<g fill="none"
				fillRule="evenodd"
			>
				<g className="ibp-fill-color"
					fillRule="nonzero"
				>
					<path
						d="M8 0H2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0
						8H2V2h6v6zM22 0h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0
						8h-6V2h6v6zM8 14H2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zm0
						8H2v-6h6v6zM22 14h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2zm0 8h-6v-6h6v6z"
					/>
				</g>
				<path d="M-4-4h32v32H-4z" />
			</g>
		</SvgContainer>
	);
};

Grid.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Grid;
