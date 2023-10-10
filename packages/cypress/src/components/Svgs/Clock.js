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

const Clock = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '32px'}
			height={height || '32px'}
			extendClass={extendClass}
			viewBox="0 0 32 32"
		>
			<title>{title}</title>
			<g>
				<path className="ibp-fill-color"
					d="M16 30a14 14 0 1 1 14-14 14 14 0 0 1-14 14zm0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4z"
				/>
				<path className="ibp-fill-color"
					d="M20.59 22L15 16.41V7h2v8.58l5 5.01L20.59 22z"
				/>
			</g>
		</SvgContainer>
	);
};

Clock.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default Clock;
