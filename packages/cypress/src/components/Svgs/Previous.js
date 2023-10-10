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

const Previous = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '6px'}
			height={height || '10px'}
			extendClass={extendClass}
			viewBox="0 0 6 10"
		>
			<title>{title}</title>
			<g>
				<g stroke="none"
					strokeWidth="1"
					fill="none"
					fillRule="evenodd"
				>
					<g transform="translate(-918.000000, -2377.000000)">
						<g transform="translate(113.000000, 1737.000000)">
							<g transform="translate(808.000000, 645.000000) scale(-1, 1) translate(-808.000000, -645.000000) translate(800.000000, 637.000000)">
								<g transform="translate(5.000000, 3.000000)">
									<mask fill="white">
										<polygon fill="white"
											points="6 5 1 10 0.293 9.293 4.586 5 0.293 0.707 1 0"
										/>
									</mask>
									<polygon points="6 5 1 10 0.293 9.293 4.586 5 0.293 0.707 1 0"
										fill="#F3F3F3"
										fillRule="nonzero"
									/>
								</g>
								<rect transform="translate(8.000000, 8.000000) rotate(90.000000) translate(-8.000000, -8.000000) "
									x="0"
									y="0"
									width="16"
									height="16"
								/>
							</g>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Previous.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Previous;
