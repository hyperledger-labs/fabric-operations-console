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

const Download = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer extendClass={extendClass}
			height={height || '32px'}
			viewBox="0 0 32 32"
			width={width || '32px'}
		>
			<title>{title}</title>
			<g>
				<g className="ibp-fill-color">
					<path d="M26 15l-1.41-1.41L17 21.17V2h-2v19.17l-7.59-7.58L6 15l10 10 10-10z" />
					<path d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4z" />
				</g>
			</g>
		</SvgContainer>
	);
};

Download.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Download;
