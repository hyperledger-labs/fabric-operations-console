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

const Warning = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '18px'}
			height={height || '18px'}
			extendClass={extendClass}
			viewBox="0 0 18 18"
		>
			<title>{title}</title>
			<g>
				<defs>
					<circle id="path-1"
						cx="8.75"
						cy="8.75"
						r="8.75"
					/>
					<path
						d="M0.55,0 L1.95625,0 L1.95625,6.875 L0.55,6.875 L0.55,0 Z M1.25,10.625 C0.732233047,10.625 0.3125,10.205267 0.3125,9.6875 C0.3125,9.16973305 0.732233047,8.75 1.25,8.75 C1.76776695,8.75 2.1875,9.16973305 2.1875,9.6875 C2.1875,10.205267 1.76776695,10.625 1.25,10.625 Z"
						id="path-3"
					/>
				</defs>
				<g id="Symbols"
					stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g id="icon/status/warning/filled/20"
						transform="translate(-1.000000, -1.000000)"
					>
						<g id="Group">
							<g id="warning--filled"
								transform="translate(1.250000, 1.250000)"
							>
								<g id="warning-icon-color-1">
									<mask id="mask-2"
										fill="white"
									>
										<use xlinkHref="#path-1" />
									</mask>
									<use id="warning-icon-color-2"
										fill="#FDD13A"
										xlinkHref="#path-1"
									/>
								</g>
								<g id="warning-icon-color-3"
									transform="translate(7.500000, 3.750000)"
								>
									<mask id="mask-4"
										fill="white"
									>
										<use xlinkHref="#path-3" />
									</mask>
									<use id="warning-icon-color-4"
										fill="#000000"
										xlinkHref="#path-3"
									/>
								</g>
							</g>
							<rect id="transparent-rectangle"
								x="0"
								y="0"
								width="20"
								height="20"
							/>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Warning.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Warning;
