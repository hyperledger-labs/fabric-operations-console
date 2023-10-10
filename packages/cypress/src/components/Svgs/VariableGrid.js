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

const VariableGrid = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '13px'}
			height={height || '12px'}
			extendClass={extendClass}
			viewBox="0 0 13 12"
		>
			<title>{title}</title>
			<g>
				<g stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g transform="translate(-2.000000, -2.000000)">
						<g>
							<g transform="translate(2.000000, 2.000000)">
								<path
									d="M6,6.5 L6,10.5 L1,10.5 L1,6.5 L6,6.5 Z M6,5.5 L1,5.5 C0.45,5.5 0,5.95 0,6.5 L0,10.5 C0,11.05 0.45,
								11.5 1,11.5 L6,11.5 C6.55,11.5 7,11.05 7,10.5 L7,6.5 C7,5.95 6.55,5.5 6,5.5 Z M11.5,1 L11.5,3.5 L6.5,3.5 L6.5,
								1 L11.5,1 Z M11.5,0 L6.5,0 C5.95,0 5.5,0.45 5.5,1 L5.5,3.5 C5.5,4.05 5.95,4.5 6.5,4.5 L11.5,4.5 C12.05,4.5 12.5,
								4.05 12.5,3.5 L12.5,1 C12.5,0.45 12.05,0 11.5,0 Z M11.5,6.5 L11.5,9 L9,9 L9,6.5 L11.5,6.5 Z M11.5,5.5 L9,5.5 C8.45,
								5.5 8,5.95 8,6.5 L8,9 C8,9.55 8.45,10 9,10 L11.5,10 C12.05,10 12.5,9.55 12.5,9 L12.5,6.5 C12.5,5.95 12.05,5.5 11.5,
								5.5 Z M3.5,1 L3.5,3.5 L1,3.5 L1,1 L3.5,1 Z M3.5,0 L1,0 C0.45,0 0,0.45 0,1 L0,3.5 C0,4.05 0.45,4.5 1,4.5 L3.5,4.5 C4.05,
								4.5 4.5,4.05 4.5,3.5 L4.5,1 C4.5,0.45 4.05,0 3.5,0 Z"
									className="ibp-fill-color"
								/>
							</g>
							<rect x="0"
								y="0"
								width="16"
								height="16"
							/>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

VariableGrid.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default VariableGrid;
