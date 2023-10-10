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

const Trash = ({ extendClass, height, width, title }) => {
	return (
		<SvgContainer width={width || '24px'}
			height={height || '28px'}
			extendClass={extendClass}
			viewBox="0 0 24 28"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-799, -226)">
					<g transform="translate(795, 224)">
						<g transform="translate(4, 2)"
							className="ibp-fill-color"
							fillRule="nonzero"
						>
							<rect x="8"
								y="10"
								width="2"
								height="10"
							/>
							<rect x="14"
								y="10"
								width="2"
								height="10"
							/>
							<path d="M16,4 L16,2 C16,0.8954305 15.1045695,0 14,0 L10,0 C8.8954305,0 8,0.8954305 8,2 L8,4 L0,4 L0,6 L2,6 L2,26 C2,27.1045695 2.8954305,28 4,28 L20,28 C21.1045695,28 22,27.1045695 22,26 L22,6 L24,6 L24,4 L16,4 Z M10,2 L14,2 L14,4 L10,4 L10,2 Z M4,26 L4,6 L20,6 L20,26 L4,26 Z" />
						</g>
						<g>
							<rect x="0"
								y="0"
								width="32"
								height="32"
							/>
						</g>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

Trash.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Trash;
