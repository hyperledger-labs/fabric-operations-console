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

const Error = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '20px'}
			viewBox="0 0 20 20"
			width={width || '20px'}
		>
			<title>{title}</title>
			<g>
				<g stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g transform="translate(-1.000000, -1.000000)">
						<g>
							<g transform="translate(1.250000, 1.250000)">
								<g>
									<mask fill="white">
										<circle cx="8.75"
											cy="8.75"
											r="8.75"
										/>
									</mask>
									<circle cx="8.75"
										cy="8.75"
										r="8.75"
										fill="#FB4B53"
									/>
								</g>
								<g transform="translate(3.750000, 3.750000)">
									<mask fill="white">
										<polygon points="4.29526062 -0.488794417 5.70151062 -0.488794417 5.70151062 10.4799556 4.29526062 10.4799556" />
									</mask>
									<polygon
										transform="translate(4.998386, 4.995581) rotate(-45.000000) translate(-4.998386, -4.995581) "
										fill="#FFFFFF"
										points="4.29526062 -0.488794417 5.70151062 -0.488794417 5.70151062 10.4799556 4.29526062 10.4799556"
									/>
								</g>
							</g>
							<rect x="0"
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

Error.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Error;
