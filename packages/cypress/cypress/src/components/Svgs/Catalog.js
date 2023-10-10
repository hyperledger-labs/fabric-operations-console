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

const Catalog = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '32px'}
			viewBox="0 0 32 32"
			width={width || '32px'}
		>
			<title>{title}</title>
			<g>
				<g fill="#fff">
					<path
						d="M26,2H8A2,2,0,0,0,6,4V8H4v2H6v5H4v2H6v5H4v2H6v4a2,2,0,0,0,2,2H26a2,2,0,0,0,2-2V4A2,2,0,0,0,26,2Zm0,26H8V24h2V22H8V17h2V15H8V10h2V8H8V4H26Z"
						transform="translate(0 0)"
					/>
					<rect x="14"
						y="8"
						width="8"
						height="2"
					/>
					<rect x="14"
						y="15"
						width="8"
						height="2"
					/>
					<rect x="14"
						y="22"
						width="8"
						height="2"
					/>
				</g>
			</g>
		</SvgContainer>
	);
};

Catalog.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Catalog;
