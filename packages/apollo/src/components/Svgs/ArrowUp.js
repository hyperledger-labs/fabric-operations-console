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

const ArrowUp = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '14px'}
			height={height || '8px'}
			extendClass={extendClass}
			viewBox="0 0 14 8"
		>
			<title>{title}</title>
			<g>
				<g fill="none"
					fillRule="evenodd"
				>
					<g transform="translate(-3 -6)">
						<mask className="ibp-fill-color">
							<polygon points="10 6.25 16.25 12.5 15.36625 13.38375 10 8.0175 4.63375 13.38375 3.75 12.5"
								className="ibp-fill-color"
							/>
						</mask>
						<polygon points="10 6.25 16.25 12.5 15.36625 13.38375 10 8.0175 4.63375 13.38375 3.75 12.5"
							className="ibp-fill-color"
						/>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

ArrowUp.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default ArrowUp;
