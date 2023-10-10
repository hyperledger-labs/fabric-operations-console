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

const Cloud = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '24px'}
			viewBox="0 0 24 24"
			width={width || '24px'}
		>
			<title>{title}</title>
			<g>
				<defs>
					<path
						d="M9,1.5 C10.65,1.5 12.15,2.4 12.9,3.825 L13.425,4.725 L14.4,4.575
					C14.625,4.575 14.85,4.5 15,4.5 C17.475,4.5 19.5,6.525 19.5,9 C19.5,11.25
					17.775,13.2 15.6,13.425 L15.225,13.5 L4.5,13.5 C2.85,13.5 1.5,12.15 1.5,10.5
					C1.5,9.225 2.325,8.1 3.525,7.65 L4.575,7.275 L4.5,6.225 L4.5,6.075 L4.5,6
					C4.5,3.525 6.525,1.5 9,1.5 Z M9,0 C5.7,0 3,2.7 3,6 C3,6.075 3,6.15 3,6.225
					C1.275,6.825 0,8.475 0,10.5 C0,12.975 2.025,15 4.5,15 L15.75,15 L15.75,14.925
					C18.675,14.55 21,12 21,9 C21,5.7 18.3,3 15,3 C14.7,3 14.475,3 14.25,3.075
					C13.2,1.2 11.25,0 9,0 Z"
						id="cloud"
					/>
				</defs>
				<g stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g>
						<g id="cloud"
							transform="translate(1.500000, 4.500000)"
						>
							<mask id="mask-2"
								fill="white"
							>
								<use xlinkHref="#cloud" />
							</mask>
							<use fill="#000000"
								fillRule="nonzero"
								xlinkHref="#cloud"
							/>
							<g id="color/white"
								mask="url(#mask-2)"
								fill="#FFFFFF"
							>
								<g transform="translate(-1.500000, -4.500000)">
									<rect x="0"
										y="0"
										width="40"
										height="40"
									/>
								</g>
							</g>
						</g>
						<rect m="24" />
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Cloud.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Cloud;
