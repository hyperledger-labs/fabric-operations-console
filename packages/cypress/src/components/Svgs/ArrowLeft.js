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

const ArrowLeft = ({ extendClass, height, width, title }) => {
	return (
		<SvgContainer width={width || '26px'}
			height={height || '25px'}
			extendClass={extendClass}
			viewBox="0 0 26 20"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g fill="#ffffff"
					fillRule="nonzero"
				>
					<polygon points="10 20 11.41 18.59 3.83 11 26 11 26 9 3.83 9 11.41 1.41 10 0 0 10" />
				</g>
			</g>
		</SvgContainer>
	);
};

ArrowLeft.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default ArrowLeft;
