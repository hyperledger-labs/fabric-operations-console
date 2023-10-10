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

const Success = ({ extendClass, height, title, width }) => {
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
					<polygon id="path-3"
						points="3.125 6.5625 0 3.4375 0.99375 2.5 3.125 4.59375 7.75625 0 8.75 0.9875"
					/>
				</defs>
				<g id="Symbols"
					stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g id="icon/status/checkmark/filled/20"
						transform="translate(-1.000000, -1.000000)"
					>
						<g id="Group">
							<g id="checkmark--filled"
								transform="translate(1.250000, 1.250000)"
							>
								<g id="icon-2">
									<mask id="mask-2"
										fill="white"
									>
										<use xlinkHref="#path-1" />
									</mask>
									<use id="succes-icon-color-1"
										fill="#3DBB61"
										xlinkHref="#path-1"
									/>
								</g>
								<g id="icon-1"
									transform="translate(4.375000, 5.625000)"
								>
									<mask id="mask-4"
										fill="white"
									>
										<use xlinkHref="#path-3" />
									</mask>
									<use id="success-icon-color-2"
										fill="#FFFFFF"
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

Success.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Success;
